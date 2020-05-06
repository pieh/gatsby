const reduxNodes = require(`./nodes`)
const nodesReducer = require(`./nodes-by-type`)
import { pagesReducer } from "./pages"
import { redirectsReducer } from "./redirects"
import { schemaReducer } from "./schema"
import { staticQueryComponentsReducer } from "./static-query-components"
import { statusReducer } from "./status"
import { webpackReducer } from "./webpack"
import { pageDataReducer } from "./page-data"
import { themesReducer } from "./themes"
import { webpackCompilationHashReducer } from "./webpack-compilation-hash"
import { reducer as logReducer } from "gatsby-cli/lib/reporter/redux/reducer"

/**
 * @property exports.nodesTouched Set<string>
 */
module.exports = {
  program: require(`./program`),
  nodes: reduxNodes,
  nodesByType: nodesReducer,
  resolvedNodesCache: require(`./resolved-nodes`),
  nodesTouched: require(`./nodes-touched`),
  lastAction: require(`./last-action`),
  flattenedPlugins: require(`./flattened-plugins`),
  config: require(`./config`),
  schema: schemaReducer,
  pages: pagesReducer,
  status: statusReducer,
  componentDataDependencies: require(`./component-data-dependencies`),
  components: require(`./components`),
  staticQueryComponents: staticQueryComponentsReducer,
  jobs: require(`./jobs`),
  jobsV2: require(`./jobsv2`),
  webpack: webpackReducer,
  webpackCompilationHash: webpackCompilationHashReducer,
  redirects: redirectsReducer,
  babelrc: require(`./babelrc`),
  schemaCustomization: require(`./schema-customization`),
  themes: themesReducer,
  logs: logReducer,
  inferenceMetadata: require(`./inference-metadata`),
  pageDataStats: require(`./page-data-stats`),
  pageData: pageDataReducer,
}
