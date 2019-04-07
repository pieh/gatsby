const Redux = require(`redux`)
const _ = require(`lodash`)
const report = require(`gatsby-cli/lib/reporter`)

const mitt = require(`mitt`)
const debug = require(`debug`)(`gatsby:redux`)
// Create event emitter for actions
const emitter = mitt()

// Reducers
const reducers = require(`./reducers`)
const { writeToCache, readFromCache } = require(`./persist`)

// Read old node data from cache.
let initialState = {}
const readState = () => {
  try {
    initialState = readFromCache()
    if (initialState.nodes) {
      // re-create nodesByType
      initialState.nodesByType = new Map()
      initialState.nodes.forEach(node => {
        const { type } = node.internal
        if (!initialState.nodesByType.has(type)) {
          initialState.nodesByType.set(type, new Map())
        }
        initialState.nodesByType.get(type).set(node.id, node)
      })
    }
  } catch (e) {
    // ignore errors.
    initialState = {}
  }
  return initialState
}
readState()
exports.readState = readState

const store = Redux.createStore(
  Redux.combineReducers({ ...reducers }),
  initialState,
  Redux.applyMiddleware(function multi({ dispatch }) {
    return next => action =>
      Array.isArray(action)
        ? action.filter(Boolean).map(dispatch)
        : next(action)
  })
)

// Persist state.
function saveState() {
  if (process.env.DANGEROUSLY_DISABLE_OOM) {
    return Promise.resolve()
  }

  const state = store.getState()
  const pickedState = _.pick(state, [
    `nodes`,
    `status`,
    `componentDataDependencies`,
    `jsonDataPaths`,
    `components`,
    `staticQueryComponents`,
  ])

  const MemoryUsage = () =>
    `
  RSS: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB}
  heapTotal: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB}
  heapUsed: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB}`

  debug(`Start persisting ${MemoryUsage()}`)
  const activity = report.activityTimer(`persist state`, {
    hideSpinner: true,
  })
  activity.start()
  writeToCache(pickedState)
  activity.end()
  debug(`Finished persisting ${MemoryUsage()}`)
  return Promise.resolve()
}

exports.saveState = saveState

store.subscribe(() => {
  const lastAction = store.getState().lastAction
  emitter.emit(lastAction.type, lastAction)
})

/** Event emitter */
exports.emitter = emitter

/** Redux store */
exports.store = store
