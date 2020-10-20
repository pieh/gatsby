/* eslint-disable no-invalid-this */
import path from "path"
import { emitter, store } from "../redux"
import { Server as HTTPSServer } from "https"
import { Server as HTTPServer } from "http"
import fs from "fs-extra"
import { readPageData, IPageDataWithQueryResult } from "../utils/page-data"
import telemetry from "gatsby-telemetry"
import url from "url"
import { createHash } from "crypto"
import { findPageByPath } from "./find-page-by-path"
import socketIO from "socket.io"
import reporter from "gatsby-cli/lib/reporter"
import pDefer from "p-defer"

export interface IPageQueryResult {
  id: string
  result?: IPageDataWithQueryResult
}

export interface IStaticQueryResult {
  id: string
  result: unknown // TODO: Improve this once we understand what the type is
}

type PageResultsMap = Map<string, IPageQueryResult>
type QueryResultsMap = Map<string, IStaticQueryResult>

type PageDataPromiseReturn = IPageQueryResult | PromiseLike<IPageQueryResult>

/**
 * Get page query result for given page path.
 * @param {string} pagePath Path to a page.
 */
async function getStaticQueryData(
  staticQueryId: string
): Promise<IStaticQueryResult> {
  const { program } = store.getState()
  const publicDir = path.join(program.directory, `public`)

  const filePath = path.join(
    publicDir,
    `page-data`,
    `sq`,
    `d`,
    `${staticQueryId}.json`
  )

  const result: IStaticQueryResult = {
    id: staticQueryId,
    result: undefined,
  }
  if (await fs.pathExists(filePath)) {
    try {
      const fileResult = await fs.readJson(filePath)

      result.result = fileResult
    } catch (err) {
      // ignore errors
    }
  }

  return result
}

function hashPaths(paths: Array<string>): Array<string> {
  return paths.map(path => createHash(`sha256`).update(path).digest(`hex`))
}

interface IClientInfo {
  activePath: string | null
  socket: socketIO.Socket
}

let counter = 1

export class WebsocketManager {
  activePaths: Set<string> = new Set()
  clients: Set<IClientInfo> = new Set()
  connectedClients = 0
  errors: Map<string, string> = new Map()
  pageResults: PageResultsMap = new Map()
  staticQueryResults: QueryResultsMap = new Map()
  websocket: socketIO.Server | undefined
  pendingPathPromises: Map<
    string,
    pDefer.DeferredPromise<PageDataPromiseReturn>
  > = new Map()

  init = ({
    server,
  }: {
    directory: string
    server: HTTPSServer | HTTPServer
  }): socketIO.Server => {
    /**
     * Get page query result for given page path.
     * @param {string} pagePath Path to a page.
     */
    const getPageData = async (pagePath: string): Promise<IPageQueryResult> => {
      const state = store.getState()
      const publicDir = path.join(state.program.directory, `public`)

      const result: IPageQueryResult = {
        id: pagePath,
        result: undefined,
      }

      const page = findPageByPath(state, pagePath)

      reporter.verbose(
        `websocket getPageData: "${pagePath}" / ${JSON.stringify(
          page,
          null,
          2
        )}`
      )
      if (page) {
        const pendingDefer = this.pendingPathPromises.get(page.path)
        if (pendingDefer) {
          reporter.verbose(`there is pending promise for "${page.path}"`)
          return pendingDefer.promise
        } else {
          const trackedQuery = state.queries.trackedQueries.get(page.path)
          reporter.verbose(JSON.stringify(trackedQuery, null, 2))
          if (!trackedQuery || trackedQuery.dirty) {
            const currentPromise = counter
            counter++
            reporter.verbose(
              `query not ready or dirty "${page.path}" (#${currentPromise})`
            )
            // we need to get result
            emitter.emit(`QUERY_RUN_REQUESTED`, {
              pagePath: page.path,
            })

            const deferred = pDefer<
              IPageQueryResult | PromiseLike<IPageQueryResult>
            >()

            this.pendingPathPromises.set(page.path, {
              ...deferred,
              resolve: (pageData: PageDataPromiseReturn): void => {
                reporter.verbose(
                  `RESOLVING in flight "${page.path}" (#${currentPromise})`
                )
                deferred.resolve(pageData)
                this.pendingPathPromises.delete(page.path)
              },
            })
            return deferred.promise
          } else {
            // query is there and is not dirty - let's serve it
            try {
              const pageData: IPageDataWithQueryResult = await readPageData(
                publicDir,
                page.path
              )

              result.id = page.path
              result.result = pageData
            } catch (err) {
              throw new Error(
                `Error loading a result for the page query in "${pagePath}". Query was not run and no cached result was found.`
              )
            }
          }
        }
      }

      return result
    }

    this.websocket = socketIO(server, {
      // we see ping-pong timeouts on gatsby-cloud when socket.io is running for a while
      // increasing it should help
      // @see https://github.com/socketio/socket.io/issues/3259#issuecomment-448058937
      pingTimeout: 30000,
    })

    const updateServerActivePaths = (): void => {
      const serverActivePaths = new Set<string>()
      for (const client of this.clients) {
        if (client.activePath) {
          serverActivePaths.add(client.activePath)
        }
      }
      this.activePaths = serverActivePaths
    }

    this.websocket.on(`connection`, socket => {
      const clientInfo: IClientInfo = {
        activePath: null,
        socket,
      }
      this.clients.add(clientInfo)

      const setActivePath = (
        newActivePath: string | null,
        reason: string
      ): void => {
        let activePagePath: string | null = null
        if (newActivePath) {
          const page = findPageByPath(store.getState(), newActivePath)
          if (page) {
            activePagePath = page.path
          }
        }
        reporter.verbose(
          `Set active path: ${JSON.stringify(
            {
              newActivePath,
              activePagePath,
              reason,
            },
            null,
            2
          )}`
        )
        clientInfo.activePath = activePagePath
        updateServerActivePaths()
      }

      if (socket?.handshake?.headers?.referer) {
        const path = url.parse(socket.handshake.headers.referer).path
        setActivePath(path, `connection`)
      }

      this.connectedClients += 1
      this.errors.forEach((message, errorID) => {
        socket.send({
          type: `overlayError`,
          payload: {
            id: errorID,
            message,
          },
        })
      })

      const getDataForPath = async (path: string): Promise<void> => {
        const requestedPath = path
        const page = findPageByPath(store.getState(), path)
        if (!page) {
          socket.send({
            type: `pageQueryResult`,
            why: `getDataForPath-notfound`,
            requestedPath,
            payload: {
              id: path,
              result: undefined,
            },
          })
          return
        }
        path = page.path

        let pageData = this.pageResults.get(path)
        if (!pageData) {
          try {
            pageData = await getPageData(path)

            this.pageResults.set(path, pageData)
          } catch (err) {
            console.log(err.message)
            return
          }
        }

        const staticQueryHashes = pageData.result?.staticQueryHashes ?? []
        await Promise.all(
          staticQueryHashes.map(async queryId => {
            let staticQueryResult = this.staticQueryResults.get(queryId)

            if (!staticQueryResult) {
              staticQueryResult = await getStaticQueryData(queryId)
              this.staticQueryResults.set(queryId, staticQueryResult)
            }

            socket.send({
              type: `staticQueryResult`,
              payload: staticQueryResult,
            })
          })
        )

        socket.send({
          type: `pageQueryResult`,
          why: `getDataForPath`,
          payload: pageData,
          requestedPath,
        })

        if (this.connectedClients > 0) {
          telemetry.trackCli(
            `WEBSOCKET_PAGE_DATA_UPDATE`,
            {
              siteMeasurements: {
                clientsCount: this.connectedClients,
                paths: hashPaths(Array.from(this.activePaths)),
              },
            },
            { debounce: true }
          )
        }
      }

      socket.on(`getDataForPath`, getDataForPath)

      socket.on(`registerPath`, (path: string): void => {
        setActivePath(path, `registerPath`)
      })

      socket.on(`disconnect`, (): void => {
        setActivePath(null, `disconnect`)
        this.connectedClients -= 1
        this.clients.delete(clientInfo)
      })

      socket.on(`unregisterPath`, (_path: string): void => {
        setActivePath(null, `unregisterPath`)
      })
    })

    return this.websocket
  }

  getSocket = (): socketIO.Server | undefined => this.websocket

  emitStaticQueryData = (data: IStaticQueryResult): void => {
    this.staticQueryResults.set(data.id, data)

    if (this.websocket) {
      this.websocket.send({ type: `staticQueryResult`, payload: data })

      if (this.connectedClients > 0) {
        telemetry.trackCli(
          `WEBSOCKET_EMIT_STATIC_PAGE_DATA_UPDATE`,
          {
            siteMeasurements: {
              clientsCount: this.connectedClients,
              paths: hashPaths(Array.from(this.activePaths)),
            },
          },
          { debounce: true }
        )
      }
    }
  }

  emitPageData = (data: IPageQueryResult): void => {
    const page = findPageByPath(store.getState(), data.id)
    if (!page) {
      console.error(
        `Can't find a page for which we want to emit data: "${data.id}"`
      )
      // wat?
      return
    }

    this.pageResults.set(page.path, data)

    const pendingResolve = this.pendingPathPromises.get(page.path)
    if (pendingResolve) {
      reporter.verbose(`resolving pending promise for "${page.path}"`)
      pendingResolve.resolve(data)
    }

    if (this.websocket) {
      this.websocket.send({ type: `pageQueryResult`, payload: data })

      if (this.connectedClients > 0) {
        telemetry.trackCli(
          `WEBSOCKET_EMIT_PAGE_DATA_UPDATE`,
          {
            siteMeasurements: {
              clientsCount: this.connectedClients,
              paths: hashPaths(Array.from(this.activePaths)),
            },
          },
          { debounce: true }
        )
      }
    }
  }

  emitError = (id: string, message?: string): void => {
    if (message) {
      this.errors.set(id, message)
    } else {
      this.errors.delete(id)
    }

    if (this.websocket) {
      this.websocket.send({
        type: `overlayError`,
        payload: { id, message },
      })
    }
  }

  invalidateQueries(queries: Array<string>) {
    queries.forEach(queryId => {
      this.pageResults.delete(queryId)
      this.staticQueryResults.delete(queryId)
    })

    if (this.websocket) {
      this.websocket.send({
        type: `invalidateQueryResults`,
        payload: queries,
      })
    }
  }
}

export const websocketManager: WebsocketManager = new WebsocketManager()
