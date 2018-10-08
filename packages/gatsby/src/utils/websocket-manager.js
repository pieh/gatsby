// @flow

const path = require(`path`)
const { store } = require(`../redux`)
const fs = require(`fs`)
const _ = require(`lodash`)
const debug = require(`debug`)(`gatsby:websocket-manager`)

type QueryResult = {
  id: string,
  result: object,
}

type QueryResultsMap = Map<string, QueryResult>

type FetchPageQueryDataReason = "Navigation" | "Prefetch" | "Hover"

/**
 * Get cached query result for given data path.
 * @param {string} dataFileName Cached query result filename.
 * @param {string} directory Root directory of current project.
 */
const readCachedResults = (dataFileName: string, directory: string): object => {
  const filePath = path.join(
    directory,
    `public`,
    `static`,
    `d`,
    `${dataFileName}.json`
  )
  return JSON.parse(fs.readFileSync(filePath, `utf-8`))
}

/**
 * Get cached page query result for given page path.
 * @param {string} pagePath Path to a page.
 * @param {string} directory Root directory of current project.
 */
const getCachedPageData = (
  pagePath: string,
  directory: string
): QueryResult => {
  const { jsonDataPaths, pages } = store.getState()
  const page = pages.get(pagePath)
  if (!page) {
    return null
  }
  const dataPath = jsonDataPaths[page.jsonName]
  if (!dataPath) {
    // console.log(
    //   `Error loading a result for the page query in "${pagePath}". Query was not run and no cached result was found.`
    // )
    return undefined
  }

  return {
    result: readCachedResults(dataPath, directory),
    id: pagePath,
  }
}

/**
 * Get cached StaticQuery results for components that Gatsby didn't run query yet.
 * @param {QueryResultsMap} resultsMap Already stored results for queries that don't need to be read from files.
 * @param {string} directory Root directory of current project.
 */
const getCachedStaticQueryResults = (
  resultsMap: QueryResultsMap,
  directory: string
): QueryResultsMap => {
  const cachedStaticQueryResults = new Map()
  const { staticQueryComponents, jsonDataPaths } = store.getState()
  staticQueryComponents.forEach(staticQueryComponent => {
    // Don't read from file if results were already passed from query runner
    if (resultsMap.has(staticQueryComponent.hash)) return

    const dataPath = jsonDataPaths[staticQueryComponent.jsonName]
    if (!dataPath) {
      console.log(
        `Error loading a result for the StaticQuery in "${
          staticQueryComponent.componentPath
        }". Query was not run and no cached result was found.`
      )
      return
    }
    cachedStaticQueryResults.set(staticQueryComponent.hash, {
      result: readCachedResults(dataPath, directory),
      id: staticQueryComponent.hash,
    })
  })
  return cachedStaticQueryResults
}

const getRoomNameFromPath = (path: string): string => `path-${path}`

class WebsocketManager {
  pageResults: QueryResultsMap
  staticQueryResults: QueryResultsMap
  isInitialised: boolean
  activePaths: Set<string>
  programDir: string

  constructor() {
    this.isInitialised = false
    // this.activePaths = getPathFilter()
    this.pageResults = new Map()
    this.staticQueryResults = new Map()
    this.websocket
    this.programDir

    this.init = this.init.bind(this)
    this.getSocket = this.getSocket.bind(this)
    this.emitPageData = this.emitPageData.bind(this)
    this.emitStaticQueryData = this.emitStaticQueryData.bind(this)
  }

  init({ server, directory }) {
    this.programDir = directory

    const cachedStaticQueryResults = getCachedStaticQueryResults(
      this.staticQueryResults,
      this.programDir
    )
    this.staticQueryResults = new Map([
      ...this.staticQueryResults,
      ...cachedStaticQueryResults,
    ])

    this.websocket = require(`socket.io`)(server)

    this.websocket.on(`connection`, s => {
      let activePath = null
      // Send already existing static query results
      this.staticQueryResults.forEach(result => {
        this.websocket.send({
          type: `staticQueryResult`,
          payload: result,
        })
      })

      const leaveRoom = path => {
        s.leave(getRoomNameFromPath(path))
        const leftRoom = this.websocket.sockets.adapter.rooms[
          getRoomNameFromPath(path)
        ]
        if (!leftRoom || leftRoom.length === 0) {
          this.activePaths.delete(path)
        }
      }

      const getDataForPath = (
        path: string,
        fetchReason: FetchPageQueryDataReason
      ) => {
        let howIHaveThis = `from memory`
        if (!this.pageResults.has(path)) {
          const result = getCachedPageData(path, this.programDir)
          if (result) {
            howIHaveThis = `read from cache`
            this.pageResults.set(path, result)
          } else {
            // console.log(`Results not found`, path)
            return
          }
        }

        debug(
          `Emitting results ${path} ${fetchReason} ${howIHaveThis} ${_.get(
            this.pageResults.get(path),
            `result.data.markdownRemark.excerpt`
          )}`
        )

        this.websocket.send({
          type: `pageQueryResult`,
          why: `getDataForPath`,
          reason: fetchReason,
          payload: this.pageResults.get(path),
        })
      }

      s.on(`getDataForPath`, getDataForPath)

      s.on(`registerPath`, path => {
        debug(`Register path`, path)
        if (activePath === path) {
          return
        } else if (activePath) {
          leaveRoom(activePath)
        }
        activePath = path
        s.join(getRoomNameFromPath(path))
        this.activePaths.add(path)
      })

      s.on(`disconnect`, s => {
        leaveRoom(activePath)
      })

      // s.on(`unregisterPath`, path => {
      //   leaveRoom(path)
      // })
    })

    this.isInitialised = true
  }

  getSocket() {
    return this.isInitialised && this.websocket
  }

  emitStaticQueryData(data: QueryResult) {
    this.staticQueryResults.set(data.id, data)
    if (this.isInitialised) {
      this.websocket.send({ type: `staticQueryResult`, payload: data })
    }
  }

  emitPageData(data: QueryResult) {
    this.pageResults.set(data.id, data)
    if (this.isInitialised) {
      debug(`Emitting results`, data.id)
      this.websocket.send({ type: `pageQueryResult`, payload: data })
    }
  }

  removePageQueryResult(path: string) {
    this.pageResults.delete(path)
    if (this.isInitialised) {
      debug(`Deleting page query results`, path)
      this.websocket.send({
        type: `pageQueryResult`,
        payload: {
          id: path,
          result: null,
        },
      })
    }
  }
}

const manager = new WebsocketManager()

module.exports = manager
