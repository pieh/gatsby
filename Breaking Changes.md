* Remove postcss plugins (cssnext, cssimport) from default css loader config
* boundActionCreators => actions
* pathContext => pageContext
* Source & transformer plugins now use UUIDs for ids. If you used glob or regex to query nodes by id then you'll need to query something else.
* Mixed commonjs/es6 modules fail
* Remove explicit polyfill and use the new builtins: usage support in babel 7.
* Changed `modifyBabelrc` to `onCreateBabelConfig`
* Changed `modifyWebpackConfig` to `onCreateWebpackConfig`
* Inlining CSS changed — remove it from any custom html.js as done automatically by core now.
* Manually install `react` and `react-dom`, along with any dependencies required by your plugins.
* Layouts have been removed. To achieve the same behavior as v1, you have to wrap your pages and page templates with your own Layout component. Since Layout is a non-page component, making query has to be done with StaticQuery.
* `graphql` package is exported from `gatsby`. If you use `setFieldsOnGraphQLNodeType` node API, please import graphql types from `gatsby/graphql` to prevent `Schema must contain unique named types but contains multiple types named "<typename>"` errors.
