const path = require(`path`)
const _ = require(`lodash`)

const loadCachedConfig = () => {
  let pluginBabelConfig = {
    stages: {
      test: { plugins: [], presets: [] },
    },
  }
  if (process.env.NODE_ENV !== `test`) {
    pluginBabelConfig = require(path.join(
      process.cwd(),
      `./.cache/babelState.json`
    ))
  }
  return pluginBabelConfig
}

const getCustomOptions = stage => {
  const pluginBabelConfig = loadCachedConfig()
  return pluginBabelConfig.stages[stage].options
}

const lookup = new Map()

let cacheStats = {
  babel: { hit: 0, miss: 0 },
  stage: { hit: 0, miss: 0 },
  id: { hit: 0, miss: 0 },
}

const getCached = (id, babel, stage, factory) => {
  // return factory()
  if (!lookup.has(babel)) {
    cacheStats.babel.miss++
    lookup.set(babel, new Map())
  } else {
    cacheStats.babel.hit++
  }

  const cachedForBabel = lookup.get(babel)

  if (!cachedForBabel.has(stage)) {
    cacheStats.stage.miss++
    cachedForBabel.set(stage, new Map())
  } else {
    cacheStats.stage.hit++
  }

  const cachedForStage = cachedForBabel.get(stage)

  if (!cachedForStage.has(id)) {
    cacheStats.id.miss++
    let toReturn = factory()
    cachedForStage.set(id, toReturn)
    return toReturn
  } else {
    cacheStats.id.hit++
    return cachedForStage.get(id)
  }
}

const prepareOptions = (babel, options = {}, resolve = require.resolve) => {
  const pluginBabelConfig = loadCachedConfig()

  const { stage, reactRuntime } = options

  // Required plugins/presets
  const requiredPlugins = [
    getCached(`remove-graphql-queries`, babel, stage, () =>
      babel.createConfigItem(
        [
          resolve(`babel-plugin-remove-graphql-queries`),
          { stage, staticQueryDir: `page-data/sq/d` },
        ],
        {
          type: `plugin`,
        }
      )
    ),
  ]
  const requiredPresets = []

  // Stage specific plugins to add
  if (stage === `build-html` || stage === `develop-html`) {
    requiredPlugins.push(
      getCached(`babel-plugin-dynamic-import-node`, babel, stage, () =>
        babel.createConfigItem([resolve(`babel-plugin-dynamic-import-node`)], {
          type: `plugin`,
        })
      )
    )
  }

  if (stage === `develop`) {
    if (process.env.GATSBY_HOT_LOADER === `fast-refresh`) {
      requiredPlugins.push(
        getCached(`react-refresh/babel`, babel, stage, () =>
          babel.createConfigItem([resolve(`react-refresh/babel`)], {
            type: `plugin`,
          })
        )
      )
    }
    // TODO: Remove entire block when we make fast-refresh the default
    else {
      requiredPlugins.push(
        getCached(`react-hot-loader/babel`, babel, stage, () =>
          babel.createConfigItem([resolve(`react-hot-loader/babel`)], {
            type: `plugin`,
          })
        )
      )
    }
  }

  // Fallback preset
  const fallbackPresets = []

  fallbackPresets.push(
    getCached(`babel-preset-gatsby`, babel, stage, () =>
      babel.createConfigItem(
        [
          resolve(`babel-preset-gatsby`),
          {
            stage,
            reactRuntime,
          },
        ],
        {
          type: `preset`,
        }
      )
    )
  )

  // Go through babel state and create config items for presets/plugins from.
  const reduxPlugins = []
  const reduxPresets = []
  pluginBabelConfig.stages[stage].plugins.forEach(plugin => {
    reduxPlugins.push(
      getCached(resolve(plugin.name), babel, stage, () =>
        babel.createConfigItem([resolve(plugin.name), plugin.options], {
          name: plugin.name,
          type: `plugin`,
        })
      )
    )
  })
  pluginBabelConfig.stages[stage].presets.forEach(preset => {
    reduxPresets.push(
      getCached(resolve(preset.name), babel, stage, () =>
        babel.createConfigItem([resolve(preset.name), preset.options], {
          name: preset.name,
          type: `preset`,
        })
      )
    )
  })

  return [
    reduxPresets,
    reduxPlugins,
    requiredPresets,
    requiredPlugins,
    fallbackPresets,
  ]
}

const mergeConfigItemOptions = ({ items, itemToMerge, type, babel }) => {
  const index = _.findIndex(
    items,
    i => i.file.resolved === itemToMerge.file.resolved
  )

  // If this exist, merge the options, otherwise, add it to the array
  if (index !== -1) {
    items[index] = babel.createConfigItem(
      [
        itemToMerge.file.resolved,
        _.merge({}, items[index].options, itemToMerge.options),
      ],
      {
        type,
      }
    )
  } else {
    items.push(itemToMerge)
  }

  return items
}

exports.getCustomOptions = getCustomOptions

// Export helper functions for testing
exports.prepareOptions = prepareOptions
exports.mergeConfigItemOptions = mergeConfigItemOptions

exports.wat = () => {
  console.log({ cacheStats })
}
