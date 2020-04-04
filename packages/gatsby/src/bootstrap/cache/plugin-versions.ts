import { IGatsbyState } from "../../redux/types"

import { uniq } from "lodash"

export const collectPluginChanges = (plugins, state: IGatsbyState) => {
  const changedPlugins = []
  const updatedPluginsHash = {}

  const pluginVersions = plugins.reduce((merged, plugin) => {
    merged[plugin.name] = plugin.version
    return merged
  }, {})

  return {
    pluginVersions,
    changedPlugins: uniq(
      Object.keys({
        ...pluginVersions,
        ...state.status.pluginVersions,
      })
    ).filter(key => {
      const newVersion = pluginVersions[key]
      return newVersion !== state.status.pluginVersions?.[key]
    }),
  }

  return {
    changedPlugins,
    updatedPluginsHash,
  }
}
