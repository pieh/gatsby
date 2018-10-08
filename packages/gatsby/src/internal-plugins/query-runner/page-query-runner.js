// @flow

import type { QueryJob } from "../query-runner"

/**
 * Jobs of this module
 * - Ensure on bootstrap that all invalid page queries are run and report
 *   when this is done
 * - Watch for when a page's query is invalidated and
 *   - re-run it
 *     - if building production
 *     - or in develop and page is active.
 *   - or mark page query as dirty
 */

const _ = require(`lodash`)

const queue = require(`./query-queue`)
const { store, emitter } = require(`../../redux`)
const { boundActionCreators } = require(`../../redux/actions`)
const websocketManager = require(`../../utils/websocket-manager`)
const debug = require(`debug`)(`gatsby:page-query-runner`)

let queuedDirtyActions = []
let active = false
let running = false

class PathFilter extends Set<string> {
  add(path: string) {
    if (!super.has(path)) {
      super.add(path)
      debug(`add to path filter ${path}`)
      runQueuedActions()
    }
  }
}

let pathFilter = new PathFilter()

websocketManager.activePaths = pathFilter

const runQueriesForPathnamesQueue = new Set()
exports.queueQueryForPathname = pathname => {
  runQueriesForPathnamesQueue.add(pathname)
}

const runQueries = async () => {
  // Find paths dependent on dirty nodes
  queuedDirtyActions = _.uniq(queuedDirtyActions, a => a.payload.id)
  const dirtyIds = findDirtyIds(queuedDirtyActions)
  queuedDirtyActions = []

  // Find ids without data dependencies (i.e. no queries have been run for
  // them before) and run them.
  const cleanIds = findIdsWithoutDataDependencies()

  // Construct paths for all queries to run
  const pathnamesToRun = _.uniq([
    ...runQueriesForPathnamesQueue,
    ...dirtyIds,
    ...cleanIds,
  ])

  // runQueriesForPathnamesQueue.clear()

  // Run these paths
  await runQueriesForPathnames(pathnamesToRun)
  return
}

exports.runQueries = runQueries

emitter.on(`CREATE_NODE`, action => {
  queuedDirtyActions.push(action)
})

emitter.on(`DELETE_NODE`, action => {
  queuedDirtyActions.push({ payload: action.payload })
})

emitter.on(`BOOTSTRAP_FINISHED`, () => {
  active = true
  runQueuedActions()
})

const runQueuedActions = async () => {
  if (active && !running) {
    try {
      running = true
      // console.trace()
      await runQueries()
    } finally {
      running = false
      if (queuedDirtyActions.length > 0) {
        runQueuedActions()
      }
    }
  }
}
exports.runQueuedActions = runQueuedActions

// Wait until all plugins have finished running (e.g. various
// transformer plugins) before running queries so we don't
// query things in a 1/2 finished state.
emitter.on(`API_RUNNING_QUEUE_EMPTY`, runQueuedActions)

let seenIdsWithoutDataDependencies = []
const findIdsWithoutDataDependencies = () => {
  const state = store.getState()
  const allTrackedIds = _.uniq(
    _.flatten(
      _.concat(
        _.values(state.componentDataDependencies.nodes),
        _.values(state.componentDataDependencies.connections)
      )
    )
  )

  // Get list of paths not already tracked and run the queries for these
  // paths.
  const notTrackedIds = _.difference(
    [
      ...Array.from(state.pages.values(), p => p.path),
      ...[...state.staticQueryComponents.values()].map(c => c.jsonName),
    ],
    [...allTrackedIds, ...seenIdsWithoutDataDependencies]
  )

  // Add new IDs to our seen array so we don't keep trying to run queries for them.
  // Pages without queries can't be tracked.
  seenIdsWithoutDataDependencies = _.uniq([
    ...notTrackedIds,
    ...seenIdsWithoutDataDependencies,
  ])

  return notTrackedIds
}

const invalidatedPaths = new Set()

const runQueriesForPathnames = pathnames => {
  debug(`runQueriesForPathnames()`)

  const staticQueries = pathnames.filter(p => p.slice(0, 4) === `sq--`)
  const pageQueries = pathnames.filter(p => p.slice(0, 4) !== `sq--`)
  const state = store.getState()

  staticQueries.forEach(id => {
    const staticQueryComponent = store.getState().staticQueryComponents.get(id)
    const queryJob: QueryJob = {
      id: staticQueryComponent.hash,
      hash: staticQueryComponent.hash,
      jsonName: staticQueryComponent.jsonName,
      query: staticQueryComponent.query,
      componentPath: staticQueryComponent.componentPath,
      context: { path: staticQueryComponent.jsonName },
    }
    runQueriesForPathnamesQueue.delete(id)
    queue.push(queryJob)
  })

  const pages = state.pages
  let didNotQueueItems = true
  const pathsToDeleteDeps = []
  const jsonDataPathsToClear = []
  pageQueries.forEach(id => {
    const page = pages.get(id)
    if (page) {
      if (process.env.gatsby_executing_command === `develop`) {
        // determine if need to run query or just mark page query as dirty
        if (!pathFilter.has(id)) {
          // if we already cleared results and dependency
          // don't do that again -
          if (!invalidatedPaths.has(id)) {
            // this will make websocket not submit stale results
            websocketManager.removePageQueryResult(id)

            // let's clear deps for path - this will make run queries for builds
            pathsToDeleteDeps.push(id)
            jsonDataPathsToClear.push(page.jsonName)

            invalidatedPaths.add(id)

            // need to explicitely add to queue, so we actually run query for the path
            // for develop
            runQueriesForPathnamesQueue.add(id)
            debug(`Invalidate page query ${id}`)
          }
          return
        }
        debug(`Run page query ${id}`)
      }
      didNotQueueItems = false
      queue.push(
        ({
          id: page.path,
          jsonName: page.jsonName,
          query: store.getState().components.get(page.componentPath).query,
          isPage: true,
          componentPath: page.componentPath,
          context: {
            ...page,
            ...page.context,
          },
        }: QueryJob)
      )
      runQueriesForPathnamesQueue.delete(id)
      invalidatedPaths.delete(id)
    }
  })

  if (pathsToDeleteDeps.length > 0) {
    boundActionCreators.deleteComponentsDependencies(pathsToDeleteDeps)
  }

  if (jsonDataPathsToClear.length > 0) {
    boundActionCreators.clearJsonDataPaths(jsonDataPathsToClear)
  }

  if (didNotQueueItems || !pathnames || pathnames.length === 0) {
    return Promise.resolve()
  }

  return new Promise(resolve => {
    queue.on(`drain`, () => {
      resolve()
    })
  })
}

const findDirtyIds = actions => {
  const state = store.getState()
  const uniqDirties = _.uniq(
    actions.reduce((dirtyIds, action) => {
      const node = action.payload

      if (!node || !node.id || !node.internal.type) return dirtyIds

      // Find components that depend on this node so are now dirty.
      dirtyIds = dirtyIds.concat(state.componentDataDependencies.nodes[node.id])

      // Find connections that depend on this node so are now invalid.
      dirtyIds = dirtyIds.concat(
        state.componentDataDependencies.connections[node.internal.type]
      )

      return _.compact(dirtyIds)
    }, [])
  )
  return uniqDirties
}
