/* eslint-disable no-invalid-this */
import path from "path"
import { store, emitter } from "../redux"
import { IGatsbyPage } from "../redux/types"
import { Server as HTTPSServer } from "https"
import { Server as HTTPServer } from "http"
import fs from "fs-extra"
import { readPageData, IPageDataWithQueryResult } from "../utils/page-data"
import telemetry from "gatsby-telemetry"
import url from "url"
import { createHash } from "crypto"
import { normalizePagePath, denormalizePagePath } from "./normalize-page-path"
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

function getPageForPath(pagePath: string): IGatsbyPage | undefined {
  const { pages } = store.getState()
  const denormalizedPath = denormalizePagePath(pagePath)
  const normalizedPath = normalizePagePath(pagePath)
  return pages.get(normalizedPath) || pages.get(denormalizedPath)
}

let counter = 1

/**
 * Get page query result for given page path.
 * @param {string} pagePath Path to a page.
 */
async function getPageData(
  pagePath: string
): Promise<IPageQueryResult | undefined> {
  const { program } = store.getState()
  const publicDir = path.join(program.directory, `public`)

  const result: IPageQueryResult = {
    id: pagePath,
    result: undefined,
  }

  const { dirtyQueries } = require(`../query`)

  // const denormalizedPath = denormalizePagePath(pagePath)
  // const normalizedPath = normalizePagePath(pagePath)

  const page = getPageForPath(pagePath)
  //pages.get(normalizedPath) || pages.get(denormalizedPath)

  if (page) {
    // this is not great - there will be stale page-data files, so it will need to check
    // if we need fresh one or not - this logic should not live in websocket-manager module
    const pendingDefer = pendingPathPromises.get(page.path)
    if (pendingDefer) {
      return pendingDefer.promise
    } else if (dirtyQueries.has(page.path)) {
      const currentPromise = counter
      counter++

      reporter.verbose(
        `query not ready or dirty ${page.path} #${currentPromise}`
      )
      emitter.emit(`RUN_QUERIES_FOR_PATH`, { pagePath: page.path })

      const path = page.path

      const deferred = pDefer<
        IPageQueryResult | PromiseLike<IPageQueryResult> | undefined
      >()

      // return { dirtyQueries}

      pendingPathPromises.set(path, {
        ...deferred,
        resolve: (pageData?: PageDataPromiseReturn): void => {
          reporter.verbose(
            `query not ready or dirty ${page.path} #${currentPromise}`
          )
          deferred.resolve(pageData)
          pendingPathPromises.delete(path)
        },
      })

      return deferred.promise

      // return new Promise(resolve => {
      //
      //   counter++
      //   console.log(`[websocket-manager] getPageData call for`, {
      //     pagePath,
      //     currentPromise,
      //   })
      //   pendingPathPromises.set(path, (...args) => {})
      // })
    } else {
      try {
        const pageData: IPageDataWithQueryResult = await readPageData(
          publicDir,
          pagePath
        )

        result.result = pageData
      } catch (err) {
        throw new Error(
          `Error loading a result for the page query in "${pagePath}". Query was not run and no cached result was found.`
        )
      }
    }
  }

  return result
}

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

const getRoomNameFromPath = (path: string): string => `path-${path}`

// type ResolveForPendingQueryRun = (
//   result: IPageQueryResult | PromiseLike<IPageQueryResult> | undefined
// ) => void

type PageDataPromiseReturn =
  | IPageQueryResult
  | PromiseLike<IPageQueryResult>
  | undefined
const pendingPathPromises: Map<
  string,
  pDefer.DeferredPromise<PageDataPromiseReturn>
> = new Map()

export class WebsocketManager {
  activePaths: Set<string> = new Set()
  pendingPaths: Map<string, number> = new Map()
  connectedClients = 0
  errors: Map<string, string> = new Map()
  pageResults: PageResultsMap = new Map()
  staticQueryResults: QueryResultsMap = new Map()
  websocket: socketIO.Server | undefined

  init = ({
    server,
  }: {
    directory: string
    server: HTTPSServer | HTTPServer
  }): socketIO.Server => {
    this.websocket = socketIO(server, {
      // we see ping-pong timeouts on gatsby-cloud when socket.io is running for a while
      // increasing it should help
      // @see https://github.com/socketio/socket.io/issues/3259#issuecomment-448058937
      pingTimeout: 30000,
    })

    this.websocket.on(`connection`, socket => {
      let activePath: string | null = null
      if (socket?.handshake?.headers?.referer) {
        const path = url.parse(socket.handshake.headers.referer).path
        if (path) {
          const page = getPageForPath(path)
          if (page) {
            activePath = page.path
            this.activePaths.add(page.path)
            this.printOutActivePaths()
          }
        }
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

      const leaveRoom = (path: string): void => {
        if (!path) {
          return
        }

        const page = getPageForPath(path)
        if (page) {
          socket.leave(getRoomNameFromPath(page.path))
          if (!this.websocket) return
          const leftRoom = this.websocket.sockets.adapter.rooms[
            getRoomNameFromPath(page.path)
          ]
          if (!leftRoom || leftRoom.length === 0) {
            this.activePaths.delete(page.path)
            this.printOutActivePaths()
          }
        }
      }

      const getDataForPath = async (path: string): Promise<void> => {
        const page = getPageForPath(path)
        if (!page) {
          return
        }

        // const normalizedPath = normalizePagePath(path)
        let pageData = this.pageResults.get(page.path)
        if (!pageData) {
          try {
            {
              const pendingPath = this.pendingPaths.get(page.path)
              if (pendingPath) {
                this.pendingPaths.set(page.path, pendingPath + 1)
              } else {
                this.pendingPaths.set(page.path, 1)
              }
            }

            console.log(`getting page data for`, { pagePath: page.path })
            pageData = await getPageData(page.path)
            console.log(`got page data for`, { pagePath: page.path, pageData })

            {
              const pendingPath = this.pendingPaths.get(page.path)
              if (!pendingPath || pendingPath <= 1) {
                this.pendingPaths.delete(page.path)
              } else {
                this.pendingPaths.set(page.path, pendingPath - 1)
              }
            }

            if (pageData) {
              this.pageResults.set(page.path, pageData)
            }
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
        socket.join(getRoomNameFromPath(path))
        if (path) {
          const page = getPageForPath(path)
          if (page) {
            activePath = page.path
            this.activePaths.add(page.path)
            this.printOutActivePaths()
          }

          // activePath = path
          // this.activePaths.add(path)
          // this.printOutActivePaths()
        }
      })

      socket.on(`disconnect`, (): void => {
        if (activePath) leaveRoom(activePath)
        this.connectedClients -= 1
      })

      socket.on(`unregisterPath`, (path: string): void => {
        leaveRoom(path)
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
    console.log(`emit page data`, { data })

    const page = getPageForPath(data.id)
    if (!page) {
      // wat?
      return
    }

    data.id = page.path
    this.pageResults.set(data.id, data)

    const pendingResolve = pendingPathPromises.get(data.id)
    if (pendingResolve) {
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

  printOutActivePaths() {
    if (this.activePaths.size > 0) {
      reporter.verbose(
        `[websocket-manager] Active dev server paths:\n${Array.from(
          this.activePaths
        )
          .map(path => ` - ${path}`)
          .join(`\n`)}`
      )
    } else {
      reporter.verbose(`[websocket-manager] No active dev server paths`)
    }
  }

  invalidateQueries(queries: Array<string>) {
    if (this.websocket) {
      this.websocket.send({
        type: `invalidateQueryResults`,
        payload: queries,
      })
    }
  }
}

export const websocketManager: WebsocketManager = new WebsocketManager()
