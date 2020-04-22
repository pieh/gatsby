const path = require(`path`)
const fs = require(`fs-extra`)
const _ = require(`lodash`)

const getPluginHash = require(`./plugin-hash`)

const CACHE_FOLDER = `caches`
const DONT_DELETE = [`redux.state`, `loki`]
/*
 * This function will first calculate a diff of plugin/file changes (e.g. if gatsby-node.js changes)
 * From this, it will then selectively invalidate files in .cache/caches
 * the location where Gatsby stores long-lived cache files that can be safely kept around
 */
module.exports = async function safeRemoveCache({
  directory,
  plugins,
  existing,
  report,
}) {
  const cacheDirectory = path.join(directory, `.cache`)

  const { changes, hash } = await getPluginHash({
    plugins,
    existing,
  })

  const equalHashes = _.isEqual(existing, hash)
  const hasExistingCache = Object.keys(existing).length > 0

  await fs.ensureDir(cacheDirectory)

  if (hasExistingCache && !equalHashes) {
    report.info(report.stripIndent`
      The following plugins were changed, added or removed since the last time you ran Gatsby:
${changes.map(change => `        - ${change}`).join(`\n`)}
      As a precaution, we're invalidating parts of your cache to ensure your data is sparkly fresh.
    `)
  }

  if (!equalHashes) {
    try {
      const filesToRemove = await fs.readdir(cacheDirectory).then(allFiles =>
        allFiles.reduce((merged, file) => {
          if (file === CACHE_FOLDER) {
            return merged.concat(
              changes
                .map(pluginName =>
                  path.join(cacheDirectory, CACHE_FOLDER, pluginName)
                )
                .filter(absolutePath => fs.existsSync(absolutePath))
            )
          } else if (DONT_DELETE.includes(file)) {
            return merged
          }
          return merged.concat(path.join(cacheDirectory, file))
        }, [])
      )

      await Promise.all(filesToRemove.map(file => fs.remove(file)))
    } catch (e) {
      report.error(`Failed to remove .cache files.`, e)
    }
  }

  return { cacheDirectory, changes, hash }
}
