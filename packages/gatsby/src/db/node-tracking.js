const _ = require(`lodash`)

/**
 * Map containing links between inline objects or arrays
 * and Node that contains them
 * @type {Object.<(Object|Array),string>}
 */
const rootNodeMap = new WeakMap()

const getRootNodeId = node => rootNodeMap.get(node)

/**
 * Add link between passed data and Node. This function shouldn't be used
 * directly. Use higher level `trackInlineObjectsInRootNode`
 * @see trackInlineObjectsInRootNode
 * @param {(Object|Array)} data Inline object or array
 * @param {string} nodeId Id of node that contains data passed in first parameter
 */
const old_addRootNodeToInlineObject = (
  data,
  nodeId,
  sanitize,
  parent,
  key,
  unsupportedKeys
) => {
  if (_.isPlainObject(data) || _.isArray(data)) {
    const unsupportedKeys = new Set()
    _.each(data, (o, key) => {
      addRootNodeToInlineObject(
        o,
        nodeId,
        sanitize,
        data,
        key,
        unsupportedKeys,
        unsupportedKeys
      )
    })
    rootNodeMap.set(data, nodeId)

    // arrays and plain objects are supported - no need to to sanitize
    return
  }

  if (sanitize && data !== null) {
    const type = typeof data
    // supported types
    const isSupported =
      type === `number` ||
      type === `string` ||
      type === `boolean` ||
      type === `undefined` ||
      data instanceof Date
    if (!isSupported) {
      unsupportedKeys.add(key)
      console.log(`gotta remove stuff:`, data, type)
      // debugger
      // delete parent[key]
    }
  }
}

const addRootNodeToInlineObject = (
  data,
  nodeId,
  sanitize,
  ignore = null
  // key,
  // unsupportedKeys
) => {
  const isPlainObject = _.isPlainObject(data)

  if (isPlainObject || _.isArray(data)) {
    if (sanitize) {
      data = isPlainObject ? { ...data } : [...data]
    }
    _.each(data, (o, key) => {
      if (ignore == key) {
        return
      }
      data[key] = addRootNodeToInlineObject(o, nodeId, sanitize, null)
    })
    rootNodeMap.set(data, nodeId)

    // arrays and plain objects are supported - no need to to sanitize
    return data
  }

  if (sanitize && data !== null) {
    const type = typeof data
    const isSupported =
      type === `number` ||
      type === `string` ||
      type === `boolean` ||
      type === `undefined` ||
      data instanceof Date

    if (!isSupported) {
      return undefined
    }
  }
  // either supported or not sanitizing
  return data
}

/**
 * Adds link between inline objects/arrays contained in Node object
 * and that Node object.
 * @param {Node} node Root Node
 */
const trackInlineObjectsInRootNode = (node, sanitize = false) => {
  return addRootNodeToInlineObject(node, node.id, sanitize, `internal`)

  _.each(node, (v, k) => {
    // Ignore the node internal object.
    if (k === `internal`) {
      return
    }
    addRootNodeToInlineObject(v, node.id, sanitize, node, k)
  })

  return node
}
exports.trackInlineObjectsInRootNode = trackInlineObjectsInRootNode

/**
 * Finds top most ancestor of node that contains passed Object or Array
 * @param {(Object|Array)} obj Object/Array belonging to Node object or Node object
 * @param {nodePredicate} [predicate] Optional callback to check if ancestor meets defined conditions
 * @returns {Node} Top most ancestor if predicate is not specified
 * or first node that meet predicate conditions if predicate is specified
 */
const findRootNodeAncestor = (obj, predicate = null) => {
  const { getNode } = require(`./nodes`)

  // Find the root node.
  let rootNode = obj
  let whileCount = 0
  let rootNodeId
  while (
    (!predicate || !predicate(rootNode)) &&
    (rootNodeId = getRootNodeId(rootNode) || rootNode.parent) &&
    ((rootNode.parent && getNode(rootNode.parent) !== undefined) ||
      getNode(rootNodeId)) &&
    whileCount < 101
  ) {
    if (rootNodeId) {
      rootNode = getNode(rootNodeId)
    } else {
      rootNode = getNode(rootNode.parent)
    }
    whileCount += 1
    if (whileCount > 100) {
      console.log(
        `It looks like you have a node that's set its parent as itself`,
        rootNode
      )
    }
  }

  return !predicate || predicate(rootNode) ? rootNode : null
}

function trackDbNodes() {
  const { getNodes } = require(`./nodes`)
  _.each(getNodes(), node => {
    trackInlineObjectsInRootNode(node)
  })
}

/**
 * @callback nodePredicate
 * @param {Node} node Node that is examined
 */
exports.findRootNodeAncestor = findRootNodeAncestor
exports.trackDbNodes = trackDbNodes
