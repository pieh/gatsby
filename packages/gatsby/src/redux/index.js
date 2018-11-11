const Redux = require(`redux`)
const _ = require(`lodash`)
const fs = require(`fs-extra`)
const mitt = require(`mitt`)
const stringify = require(`json-stream-stringify`)
const Queue = require(`better-queue`)
const path = require(`path`)
const crypto = require(`crypto`)
const os = require(`os`)

const debug = require(`debug`)(`gatsby:redux/index`)

// Create event emitter for actions
const emitter = mitt()

// Reducers
const reducers = require(`./reducers`)

const objectToMap = obj => {
  let map = new Map()
  Object.keys(obj).forEach(key => {
    map.set(key, obj[key])
  })
  return map
}

const mapToObject = map => {
  const obj = {}
  for (let [key, value] of map) {
    obj[key] = value
  }
  return obj
}

// Read from cache the old node data.
let initialState = {}
try {
  const file = fs.readFileSync(`${process.cwd()}/.cache/redux-state.json`)
  // Apparently the file mocking in node-tracking-test.js
  // can override the file reading replacing the mocked string with
  // an already parsed object.
  if (Buffer.isBuffer(file) || typeof file === `string`) {
    initialState = JSON.parse(file)
  }
  if (initialState.staticQueryComponents) {
    initialState.staticQueryComponents = objectToMap(
      initialState.staticQueryComponents
    )
  }
  if (initialState.components) {
    initialState.components = objectToMap(initialState.components)
  }
  if (initialState.nodes) {
    initialState.nodes = objectToMap(initialState.nodes)
  }
} catch (e) {
  // ignore errors.
}

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

const reduxStateFilePath = `${process.cwd()}/.cache/redux-state.json`
const getTmpFilePath = () =>
  path.join(os.tmpdir(), crypto.randomBytes(20).toString(`hex`))
let saveTaskPromise = Promise.resolve()
let saveTaskResolve

// Persist state.
const queue = new Queue(async ({ state }, cb) => {
  saveTaskPromise = new Promise(resolve => (saveTaskResolve = resolve))
  const pickedState = _.pick(state, [
    `nodes`,
    `status`,
    `componentDataDependencies`,
    `jsonDataPaths`,
    `components`,
    `staticQueryComponents`,
  ])

  pickedState.staticQueryComponents = mapToObject(
    pickedState.staticQueryComponents
  )
  pickedState.components = mapToObject(pickedState.components)
  pickedState.nodes = mapToObject(pickedState.nodes)

  const tmpFilePath = getTmpFilePath()
  debug(`saving state to ${tmpFilePath}`)
  const writeStream = fs.createWriteStream(tmpFilePath)

  new stringify(pickedState, null, 2, true)
    .pipe(writeStream)
    .on(`finish`, () => {
      writeStream.destroy()
      writeStream.end()

      debug(`saved state to ${tmpFilePath}, moving to ${reduxStateFilePath}`)
      fs.move(tmpFilePath, reduxStateFilePath, { overwrite: true }, error => {
        debug(
          `saved moved to ${reduxStateFilePath} ${error ? `with error` : `OK`}`
        )
        cb(error)
      })
    })
    .on(`error`, error => {
      writeStream.destroy()
      writeStream.end()
      cb(error)
    })
})

queue.on(`drain`, () => {
  saveTaskResolve()
})

const saveState = state => queue.push({ state, id: `saveState` })
const saveStateDebounced = _.debounce(saveState, 1000)

store.subscribe(() => {
  const lastAction = store.getState().lastAction
  emitter.emit(lastAction.type, lastAction)
})

const onBootstrapFinished = () => {
  saveState(store.getState())
  emitter.off(`BOOTSTRAP_FINISHED`, onBootstrapFinished)

  // During development, once bootstrap is finished, persist state on changes.
  if (process.env.gatsby_executing_command === `develop`) {
    store.subscribe(() => {
      saveStateDebounced(store.getState())
    })
  }
}

// Persist state once bootstrap has finished.
emitter.on(`BOOTSTRAP_FINISHED`, onBootstrapFinished)

/** Event emitter */
exports.emitter = emitter

/** Redux store */
exports.store = store

exports.getSaveStatePromise = () => saveTaskPromise
