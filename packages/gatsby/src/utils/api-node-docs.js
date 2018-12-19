/* eslint-disable no-unused-vars, prettier/prettier */
const IGatsbyNodeHelpers = require(`./api-node-helpers-docs`);

/**
 * Description of plugin options - you can pass them in gatsby-config etc.
 *
 * Do we have a link to explain plugin options?
 * @typedef PluginOptions
 * @type {Object}
 */
const PluginOptions = true;

/** */
const GatsbyNodeHelpers = {
  ...IGatsbyNodeHelpers,
};

/**
 * Description
 * @callback Callback dsadaw
 * Desciption
 */
const Callback = true;

/**
 * @callback Hook
 * @param {GatsbyNodeHelpers} gatsbyNodeHelpers
 * @param {PluginOptions} pluginOptions
 * @param {Callback} [cb]
 * @returns {void|Promise}
 */

/**
 * @callback HookForResolvableExtensions
 * @param {GatsbyNodeHelpers} gatsbyNodeHelpers
 * @param {PluginOptions} pluginOptions
 * @returns {String[]|Promise<String[]>}
 */

/**
 * Lets plugins implementing support for other compile-to-js add to the list
 * of "resolvable" file extensions. Gatsby supports `.js` and `.jsx` by default.
 * @type {Hook}
 * @example
 */
exports.resolvableExtensions = true;

/**
 * @type {Object}
 */
const GatsbyNodeHelpersWithGraphql = {
  ...GatsbyNodeHelpers,

  /**
   * @callback GraphqlFn
   * @param {string} query GraphQL query string
   * @returns {Promise<QueryExecutionResult>}
   */

  /**
   * Execute GraphQL query
   * @type {GraphqlFn}
   */
  graphql: true,
};

/**
 * @callback HookWithGraphql
 * @param {GatsbyNodeHelpersWithGraphql} gatsbyNodeHelpers
 * @param {PluginOptions} pluginOptions
 * @returns {void|Promise}
 */

/**
 * Tell plugins to add pages. This extension point is called only after the initial
 * sourcing and transformation of nodes plus creation of the GraphQL schema are
 * complete so you can query your data in order to create pages.
 *
 * See also [the documentation for the action `createPage`](/docs/actions/#createPage).
 * @type {HookWithGraphql}
 * @example
 * const path = require(`path`)
 *
 * exports.createPages = ({ graphql, actions }) => {
 *   const { createPage } = actions
 *   const blogPostTemplate = path.resolve(`src/templates/blog-post.js`)
 *   // Query for markdown nodes to use in creating pages.
 *   // You can query for whatever data you want to create pages for e.g.
 *   // products, portfolio items, landing pages, etc.
 *   return graphql(`
 *     {
 *       allMarkdownRemark(limit: 1000) {
 *         edges {
 *           node {
 *             fields {
 *               slug
 *             }
 *           }
 *         }
 *       }
 *     }
 *   `).then(result => {
 *     if (result.errors) {
 *       throw result.errors
 *     }
 *
 *     // Create blog post pages.
 *     result.data.allMarkdownRemark.edges.forEach(edge => {
 *       createPage({
 *         // Path for this page — required
 *         path: `${edge.node.fields.slug}`,
 *         component: blogPostTemplate,
 *         context: {
 *           // Add optional context data to be inserted
 *           // as props into the page component..
 *           //
 *           // The context data can also be used as
 *           // arguments to the page GraphQL query.
 *           //
 *           // The page "path" is always available as a GraphQL
 *           // argument.
 *         },
 *       })
 *     })
 *   })
 * }
 */
exports.createPages = true;

/**
 * Like `createPages` but for plugins who want to manage creating and removing
 * pages themselves in response to changes in data *not* managed by Gatsby.
 * Plugins implementing `createPages` will get called regularly to recompute
 * page information as Gatsby's data changes but those implementing
 * `createPagesStatefully` will not.
 *
 * An example of a plugin that uses this extension point is the plugin
 * [gatsby-plugin-page-creator](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-plugin-page-creator)
 * which monitors the `src/pages` directory for the adding and removal of JS
 * pages. As its source of truth, files in the pages directory, is not known by
 * Gatsby, it needs to keep its own state about its world to know when to
 * add and remove pages.
 * @type {HookWithGraphql}
 */
exports.createPagesStatefully = true;

/**
 * Extension point to tell plugins to source nodes. This API is called during
 * the Gatsby bootstrap sequence. Source plugins use this hook to create nodes.
 * This API is called exactly once per plugin (and once for your site's
 * `gatsby-config.js` file). If you define this hook in `gatsby-node.js` it
 * will be called exactly once after all of your source plugins have finished
 * creating nodes.
 *
 * See also the documentation for [`createNode`](/docs/actions/#createNode).
 * @type {Hook}
 * @example
 * exports.sourceNodes = ({ actions, createNodeId, createContentDigest }) => {
 *   const { createNode } = actions
 *
 *   // Data can come from anywhere, but for now create it manually
 *   const myData = {
 *     key: 123,
 *     foo: `The foo field of my node`,
 *     bar: `Baz`
 *   }
 *
 *   const nodeContent = JSON.stringify(myData)
 *
 *   const nodeMeta = {
 *     id: createNodeId(`my-data-${myData.key}`),
 *     parent: null,
 *     children: [],
 *     internal: {
 *       type: `MyNodeType`,
 *       mediaType: `text/html`,
 *       content: nodeContent,
 *       contentDigest: createContentDigest(myData)
 *     }
 *   }
 *
 *   const node = Object.assign({}, myData, nodeMeta)
 *   createNode(node)
 * }
 */
exports.sourceNodes = true;

/**
 * @type {Object}
 */
const GatsbyNodeHelpersWithNode = {
  ...GatsbyNodeHelpers,

  /**
   * @type {Node}
   */
  node: true,
};

/**
 * @callback HookWithNode
 * @param {GatsbyNodeHelpersWithNode} gatsbyNodeHelpers
 * @param {PluginOptions} pluginOptions
 * @returns {void|Promise}
 */

/**
 * Called when a new node is created. Plugins wishing to extend or
 * transform nodes created by other plugins should implement this API.
 *
 * See also the documentation for [`createNode`](/docs/actions/#createNode)
 * and [`createNodeField`](/docs/actions/#createNodeField)
 * @type {HookWithNode}
 * @example
 * exports.onCreateNode = ({ node, actions }) => {
 *   const { createNode, createNodeField } = actions
 *   // Transform the new node here and create a new node or
 *   // create a new node field.
 * }
 */
exports.onCreateNode = true;

/**
 * @type {Object}
 */
const GatsbyNodeHelpersWithPage = {
  ...GatsbyNodeHelpers,

  /**
   * @type {Page}
   */
  page: true,
};

/**
 * @callback HookWithPage
 * @param {GatsbyNodeHelpersWithPage} gatsbyNodeHelpers
 * @param {PluginOptions} pluginOptions
 * @returns {void|Promise}
 */

/**
 * Called when a new page is created. This extension API is useful
 * for programmatically manipulating pages created by other plugins e.g.
 * if you want paths without trailing slashes.
 *
 * See the guide [Creating and Modifying Pages](/docs/creating-and-modifying-pages/)
 * for more on this API.
 * @type {HookWithPage}
 */
exports.onCreatePage = true;

/**
 * @typedef IntermediateType
 * @type {Object}
 * @property {string} name
 * @property {Nodes[]} nodes
 */
const IntermediateType = true;

/**
 * @type {Object}
 */
const GatsbyNodeHelpersWithType = {
  ...GatsbyNodeHelpers,

  /**
   * @type {IntermediateType}
   */
  type: true,
};

/**
 * @callback HookWithType
 * @param {GatsbyNodeHelpersWithType} gatsbyNodeHelpers
 * @param {PluginOptions} pluginOptions
 * @returns {GraphQLFieldConfigMap|Promise<GraphQLFieldConfigMap>}
 */

/**
 * Called during the creation of the GraphQL schema. Allows plugins
 * to add new fields to the types created from data nodes. It will be called
 * separately for each type.
 *
 * This function should return an object in the shape of
 * [GraphQLFieldConfigMap](https://graphql.org/graphql-js/type/#graphqlobjecttype)
 * which will be appended to fields inferred by Gatsby from data nodes.
 *
 * *Note:* Import GraphQL types from `gatsby/graphql` and don't add the `graphql`
 * package to your project/plugin dependencies to avoid `Schema must
 * contain unique named types but contains multiple types named` errors.
 * `gatsby/graphql` exports all builtin GraphQL types as well as the `graphQLJSON`
 * type.
 *
 * Many transformer plugins use this to add fields that take arguments.
 *
 * * [`gatsby-transformer-remark`](/packages/gatsby-transformer-remark/)
 * adds an "excerpt" field where the user when writing their query can specify
 * how many characters to prune the markdown source to.
 * * [`gatsby-transformer-sharp`](/packages/gatsby-transformer-sharp/) exposes
 * many image transformation options as GraphQL fields.
 *
 * @type {HookWithType}
 * @example
 * import { GraphQLString } from "gatsby/graphql"
 *
 * exports.setFieldsOnGraphQLNodeType = ({ type }) => {
 *   if (type.name === `File`) {
 *     return {
 *       newField: {
 *         type: GraphQLString,
 *         args: {
 *           myArgument: {
 *             type: GraphQLString,
 *           }
 *         },
 *         resolve: (source, fieldArgs) => {
 *           return `Id of this node is ${source.id}.
 *                   Field was called with argument: ${fieldArgs.myArgument}`
 *         }
 *       }
 *     }
 *   }
 *
 *   // by default return empty object
 *   return {}
 * }
 */
exports.setFieldsOnGraphQLNodeType = true;

/**
 * @callback HookForPreprocessSource
 * @param {GatsbyNodeHelpers} gatsbyNodeHelpers
 * @param {PluginOptions} pluginOptions
 * @returns {String|Promise<String>}
 */

/**
 * Ask compile-to-js plugins to process source to JavaScript so the query
 * runner can extract out GraphQL queries for running.
 * @type {HookForPreprocessSource}
 */
exports.preprocessSource = true;

/**
 * @type {Object}
 */
const GatsbyNodeHelpersBabelConfig = {
  ...GatsbyNodeHelpers,

  /**
   * The current build stage. One of 'develop', 'develop-html',
   * 'build-javascript', or 'build-html'
   */
  stage: true,
};

/**
 * @callback HookWithStage
 * @param {GatsbyNodeHelpersBabelConfig} gatsbyNodeHelpers
 * @param {PluginOptions} pluginOptions
 * @returns {void|Promise}
 */

/**
 * Let plugins extend/mutate the site's Babel configuration.
 * This API will change before 2.0 as it needs still to be converted to use
 * Redux actions.
 * @type {HookWithStage}
 */
exports.onCreateBabelConfig = true;

/**
 * @type {Object}
 */
const GatsbyNodeHelpersWebpackConfig = {
  ...GatsbyNodeHelpers,
  /**
   * Returns the current webpack config
   */
  getConfig: true,
  /**
   * The current build stage. One of 'develop', 'develop-html',
   * 'build-javascript', or 'build-html'
   */
  stage: true,
  /**
   * A set of preconfigured webpack config rules
   */
  rules: true,
  /**
   * A set of preconfigured webpack config loaders
   */
  loaders: true,
  /**
   * A set of preconfigured webpack config plugins
   */
  plugins: true,
};

/**
 * @callback HookWithWebpackUtils
 * @param {GatsbyNodeHelpersWebpackConfig} gatsbyNodeHelpers
 * @param {PluginOptions} pluginOptions
 * @returns {void|Promise}
 */

/**
 * Let plugins extend/mutate the site's webpack configuration.
 *
 * See also the documentation for [`setWebpackConfig`](/docs/actions/#setWebpackConfig).
 *
 * @type {HookWithWebpackUtils}
 * @example
 * exports.onCreateWebpackConfig = ({
 *  stage, getConfig, rules, loaders, actions
 * }) => {
 *   actions.setWebpackConfig({
 *     module: {
 *       rules: [
 *         {
 *           test: 'my-css',
 *           use: [loaders.style(), loaders.css()]
 *         },
 *       ],
 *     },
 *   });
 * }
 */
exports.onCreateWebpackConfig = true;

/**
 * The first API called during Gatsby execution, runs as soon as plugins are loaded, before cache initialization and bootstrap preparation.
 * @type {Hook}
 */
exports.onPreInit = true;

/**
 * Called once Gatsby has initialized itself and is ready to bootstrap your site.
 * @type {Hook}
 */
exports.onPreBootstrap = true;

/**
 * Called at the end of the bootstrap process after all other extension APIs have been called.
 * @type {Hook}
 */
exports.onPostBootstrap = true;

/**
 * The first extension point called during the build process. Called after the bootstrap has completed but before the build steps start.
 * @type {HookWithGraphql}
 */
exports.onPreBuild = true;

/**
 * The last extension point called after all other parts of the build process
 * are complete.
 * @type {HookWithGraphql}
 */
exports.onPostBuild = true;

/**
 * Run before GraphQL queries/fragments are extracted from JavaScript files. Useful for plugins
 * to add more JavaScript files with queries/fragments e.g. from node_modules.
 *
 * See gatsby-transformer-sharp and gatsby-source-contentful for examples.
 * @type {Hook}
 */
exports.onPreExtractQueries = true;

/**
 * @type {Object}
 */
const GatsbyNodeHelpersWithExpressApp = {
  ...GatsbyNodeHelpers,

  /**
   * @callback GraphqlFn
   * @param {string} query GraphQL query string
   * @returns {Promise<QueryExecutionResult>}
   */

  /**
   * The [Express app](https://expressjs.com/en/4x/api.html#app) used to run the dev server
   * @type {Express}
   */
  app: true,
};

/**
 * @callback HookWithExpressApp
 * @param {GatsbyNodeHelpersWithExpressApp} gatsbyNodeHelpers
 * @param {PluginOptions} pluginOptions
 * @returns {void|Promise}
 */

/**
 * Run when gatsby develop server is started, its useful to add proxy and middleware
 * to the dev server app
 * @type {HookWithExpressApp}
 * @example
 * exports.onCreateDevServer = ({ app }) => {
 *   app.get('/hello', function (req, res) {
 *     res.send('hello world')
 *   })
 * }
 */
exports.onCreateDevServer = true;
