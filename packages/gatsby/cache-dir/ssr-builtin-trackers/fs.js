function wrapObjectWithTracking(obj, mod, moduleName) {
  const wrappedModule = {}
  for (const exportName in obj) {
    const _export = obj[exportName]
    if (typeof _export === `function`) {
      wrappedModule[exportName] = function wrapper(...args) {
        global.fkinGlobalForTrackingKillMeNow.usage.push({
          moduleName,
          exportName,
          stack: new Error().stack,
        })
        return _export.apply(mod, args)
      }
    } else if (typeof _export === `object`) {
      wrappedModule[exportName] = wrapObjectWithTracking(
        _export,
        mod,
        `${moduleName}.${exportName}`
      )
    } else {
      wrappedModule[exportName] = _export
    }
  }

  return wrappedModule
}

function wrapModuleWithTracking(moduleName) {
  const mod = require(moduleName)
  return wrapObjectWithTracking(mod, mod, moduleName)
}

module.exports = wrapModuleWithTracking(`fs`)
