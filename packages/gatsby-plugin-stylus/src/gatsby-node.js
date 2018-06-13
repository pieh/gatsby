/**
 * Usage:
 *
 * // gatsby-config.js
 * plugins: [
 *  `gatsby-plugin-stylus`,
 * ],
 *
 * // Usage with options:
 *
 * // gatsby-config.js
 * plugins: [
 *   {
 *     resolve: `gatsby-plugin-stylus`,
 *     options: {
 *       use: [],
 *       import: []
 *     },
 *   },
 * ],
 */

const resolve = require(`./resolve`)

exports.onCreateWebpackConfig = (
  { actions, stage, rules, plugins, loaders },
  { postCssPlugins, ...stylusOptions }
) => {
  const { setWebpackConfig } = actions
  const PRODUCTION = stage !== `develop`

  const stylusLoader = {
    loader: resolve(`stylus-loader`),
    options: {
      sourceMap: !PRODUCTION,
      ...stylusOptions,
    },
  }

  const stylusRule = {
    test: /\.styl$/,
    exclude: /\.module\.styl$/,
    use: [
      loaders.miniCssExtract(),
      loaders.css({ importLoaders: 1 }),
      loaders.postcss({ plugins: postCssPlugins }),
      stylusLoader,
    ],
  }

  const stylusRuleModules = {
    test: /\.module\.styl$/,
    use: [
      loaders.miniCssExtract(),
      loaders.css({ modules: true, importLoaders: 1 }),
      loaders.postcss({ plugins: postCssPlugins }),
      stylusLoader,
    ],
  }

  let configRules = []

  switch (stage) {
    case `develop`:
    case `build-javascript`:
      configRules = configRules.concat([
        { oneOf: [stylusRule, stylusRuleModules] },
      ])
      break

    case `build-html`:
    case `develop-html`:
      configRules = configRules.concat([
        {
          oneOf: [
            {
              ...stylusRule,
              use: [loaders.null()],
            },
            stylusRuleModules,
          ],
        },
      ])
      break
  }

  setWebpackConfig({
    module: {
      rules: configRules,
    },
  })
}
