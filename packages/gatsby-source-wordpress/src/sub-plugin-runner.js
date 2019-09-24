module.exports = plugins => async (
  apiName,
  args,
  argsTransform = () => args,
  defaultReturn
) => {
  let result = defaultReturn
  for (let plugin of plugins) {
    const pluginRunRet = await require(plugin.resolve)[apiName](
      args,
      plugin.pluginOptions
    )
    if (pluginRunRet) {
      result = pluginRunRet
      args = argsTransform(pluginRunRet, args)
    }
  }
  return result
}
