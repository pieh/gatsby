/* eslint-disable no-unused-vars */

/** */
const GatsbyReporter = {
  /**
   * @callback GatsbyReporterFn
   * @param {string} message Message to display
   * @returns {void}
   */

  /**
   * @callback GatsbyReporterFnWithError
   * @param {string} message Message to display
   * @param {Error}[error] Optional error object
   * @returns {void}
   */

  /**
   * @type {GatsbyReporterFn}
   * @example
   * reporter.info(`text`)
   */
  info: true,

  /**
   * @type {GatsbyReporterFn}
   * @example
   * reporter.warn(`text`)
   */
  warn: true,

  /**
   * @type {GatsbyReporterFnWithError}
   * @example
   * reporter.error(`text`, new Error('something'))
   */
  error: true,

  /**
   * @type {GatsbyReporterFnWithError}
   * @example
   * reporter.panic(`text`, new Error('something'))
   */
  panic: true,

  /**
   * @type {GatsbyReporterFnWithError}
   * @example
   * reporter.panicOnBuild(`text`, new Error('something'))
   */
  panicOnBuild: true,
};

/** */
const GatsbyCache = {
  /**
   * @param {string} key
   * @returns {Promise<any>}
   * @example
   * cache.get(`unique-key`).then(value => {
   *   // do something with value
   * })
   */
  get: true,

  /**
   * @param {string} key
   * @param {any} value
   * @returns {Promise<any>}
   * @example
   * cache.set(`unique-key`, value).then(() => {
   *   // value was cached, continue your stuff
   * })
   */
  set: true,
};

/** */
const GatsbyNodeHelpers = {
  /**
   * Key-value store used to persist results of time/memory/cpu instensive tasks. All functions are async and return promises.
   * @type {GatsbyCache}
   */
  cache: true,

  /**
   * Get cache instance by name - this should only be used by plugins that accept subplugins.
   * @param {string} id Test
   * @returns {GatsbyCache} See [`cache`](#cache) section for reference.
   */
  getCache: true,

  /**
   * Create content digest from string or object
   * @param {(string|object)} input
   * @returns {string}
   */
  createContentDigest: true,

  /**
   * All action creators wrapped with a dispatch.
   *
   * See [`actions`](/docs/actions/) reference.
   * @type {Actions}
   * @deprecated Will be removed in gatsby 3.0. Use [actions](#actions) instead.
   */
  boundActionCreators: true,

  /**
   * All action creators wrapped with a dispatch.
   *
   * See [`actions`](/docs/actions/) reference.
   * @type {Actions}
   */
  actions: true,

  /**
   * @type {Function}
   * @param {Node} node
   * @returns {string}
   */
  loadNodeContent: true,

  /**
   * Internal redux state used for application state. Do not use, unless you absolutely must. Store is considered private API and can change with any version.
   * @type {ReduxStore}
   */
  store: true,

  /**
   * Internal event emitter / listener.  Do not use, unless you absolutely must. Emitter is considered private API and can change with any version.
   * @type {Emitter}
   */
  emitter: true,

  /**
   * Get array of all nodes.
   * @type {Function}
   * @returns {Node[]}
   */
  getNodes: true,

  /**
   * Get single node by given ID.
   * Don't use this in graphql resolvers - see [`getNodeAndSavePathDependency`](#getNodeAndSavePathDependency).
   * @param {string} ID id of the node.
   * @returns {Node} Single node instance.
   */
  getNode: true,

  /**
   * Get array of nodes of given type.
   * @param {string} Type of nodes
   * @returns {Node[]} Array nodes.
   */
  getNodesByType: true,

  /**
   * Stub descriptiona
   * (should we remove it? it isn't used anywhere really)
   */
  hasNodeChanged: true,

  /**
   * Set of utilities to output information to user
   * @type {GatsbyReporter}
   */
  reporter: true,

  /**
   * Get single node by given ID and creates dependency for given path.
   * This should be used instead of `getNode` in graphql resolvers to enable
   * tracking dependencies for query results. If it's not used Gatsby will
   * not rerun query if node. See [Page -> Node Dependency Tracking](/docs/page-node-dependencies/) for more details.
   * @param {string} ID id of the node.
   * @param {string} path of the node.
   * @returns {Node} Single node instance.
   */
  getNodeAndSavePathDependency: true,

  /**
   * Create UUIDv5 id
   * @param {string} input
   * @returns {string}
   */
  createNodeId: true,

  /**
   * Stub description
   */
  tracing: true,

  /**
   * Stub description
   * @type {string}
   */
  pathPrefix: true,
};

module.exports = GatsbyNodeHelpers;
