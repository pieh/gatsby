const Redux = require(`redux`)
const _ = require(`lodash`)
const fs = require(`fs-extra`)
const mitt = require(`mitt`)
const stringify = require(`json-stringify-safe`)
const path = require(`path`)
const loki = require(`lokijs`)
const lokiFsStructuredAdapter = require(`lokijs/src/loki-fs-structured-adapter`)

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

let store, db, nodeCollection

// let db

function startDb(saveFile) {
  return new Promise((resolve, reject) => {
    const adapter = new lokiFsStructuredAdapter()
    const dbOptions = {
      adapter,
      autoload: true,
      autoloadCallback: err => {
        if (err) {
          reject(err)
        } else {
          nodeCollection = db.getCollection(`nodes`)
          if (!nodeCollection) {
            nodeCollection = db.addCollection(`nodes`, {
              unique: [`id`],
              indices: [`id`],
            })
          }

          resolve()
        }
      },
      autosave: false,
      autosaveInterval: 1000,
    }

    db = new loki(saveFile, dbOptions)
  })
}

// function  =
function multiActionDispatchMiddleware({ dispatch }) {
  return next => action =>
    Array.isArray(action) ? action.filter(Boolean).map(dispatch) : next(action)
}

function lokiIntercept({ displatch }) {
  return next => action => {
    // save to db
    switch (action.type) {
      case `DELETE_CACHE`:
        nodeCollection.clear()
        break
      case `CREATE_NODE`:
      case `ADD_FIELD_TO_NODE`:
      case `ADD_CHILD_NODE_TO_PARENT_NODE`: {
        const oldLokiNode = nodeCollection.by(`id`, action.payload.id)
        if (oldLokiNode) {
          const newNode = {
            $loki: oldLokiNode.$loki,
            meta: oldLokiNode.meta,
            ...action.payload,
          }
          nodeCollection.update(newNode)
        } else {
          nodeCollection.insert(action.payload)
        }
        break
      }

      case `DELETE_NODE`:
        if (nodeCollection.by(`id`, action.payload.id)) {
          nodeCollection.remove(action.payload)
        }
        break
      case `DELETE_NODES`:
        console.log(`DELETE_NODES called`)
        break
    }

    next(action)
  }
}

async function start({ saveFile }) {
  if (!_.isString(saveFile)) {
    throw new Error(`saveFile must be a path`)
  }
  const saveDir = path.dirname(saveFile)
  console.log(`saveDir`, {
    saveDir,
    saveFile,
  })
  await fs.ensureDir(saveDir)
  await startDb(saveFile)

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
    // if (initialState.nodes) {
    //   initialState.nodes = objectToMap(initialState.nodes)
    // }
  } catch (e) {
    // ignore errors.
  }

  const d = nodeCollection.data

  store.dispatch({
    type: `FROM_PERSISTENCE_LAYER`,
    payload: initialState,
  })

  // trackNodesStart()
}

store = Redux.createStore(
  Redux.combineReducers({ ...reducers }),
  {},
  Redux.applyMiddleware(multiActionDispatchMiddleware, lokiIntercept)
)

store.subscribe(() => {
  const lastAction = store.getState().lastAction
  emitter.emit(lastAction.type, lastAction)
})

exports.start = start

// Persist state.
const saveState = state => {
  const pickedState = _.pick(state, [
    // `nodes`,
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
  // pickedState.nodes = mapToObject(pickedState.nodes)
  const stringified = stringify(pickedState, null, 2)
  fs.writeFile(
    `${process.cwd()}/.cache/redux-state.json`,
    stringified,
    () => {}
  )
  db.saveDatabase(e => {
    console.log(`saved db`, e)
  })
}
const saveStateDebounced = _.debounce(saveState, 1000)

// During development, once bootstrap is finished, persist state on changes.
let bootstrapFinished = false
if (process.env.gatsby_executing_command === `develop`) {
  emitter.on(`BOOTSTRAP_FINISHED`, () => {
    bootstrapFinished = true
    saveState(store.getState())
  })
  emitter.on(`*`, () => {
    if (bootstrapFinished) {
      saveStateDebounced(store.getState())
    }
  })
}

// During builds, persist state once bootstrap has finished.
if (process.env.gatsby_executing_command === `build`) {
  emitter.on(`BOOTSTRAP_FINISHED`, () => {
    saveState(store.getState())
  })
}

/** Event emitter */
exports.emitter = emitter

/** Redux store */
exports.store = store
