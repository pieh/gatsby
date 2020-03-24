import { registerCacheKey, collectCacheKeyChanges } from "./cache-keys"
import { store } from "../../redux"

import md5File from "md5-file/promise"
import crypto from "crypto"
import fs from "fs-extra"
import report from "gatsby-cli/lib/reporter"

export const maybeInvalidateCache = async ({
  flattenedPlugins,
  cacheDirectory,
}) => {
  registerCacheKey(
    `dbType`,
    () => {
      return process.env.GATSBY_DB_NODES || `redux`
    },
    `redux`
  )
  registerCacheKey(
    `experimentalSelectiveHtmlBuilds`,
    () => {
      return !!process.env.GATSBY_EXPERIMENTAL_PAGE_BUILD_ON_DATA_CHANGES
    },
    false
  )

  const state = store.getState()

  const { changedCacheKeys, updatedCacheKeys } = collectCacheKeyChanges(state)

  const program = state.program

  // Check if any plugins have been updated since our last run. If so
  // we delete the cache is there's likely been changes
  // since the previous run.
  //
  // We do this by creating a hash of all the version numbers of installed
  // plugins, the site's package.json, gatsby-config.js, and gatsby-node.js.
  // The last, gatsby-node.js, is important as many gatsby sites put important
  // logic in there e.g. generating slugs for custom pages.
  const pluginVersions = flattenedPlugins.map(p => p.version)
  const hashes = await Promise.all([
    md5File(`package.json`),
    Promise.resolve(
      md5File(`${program.directory}/gatsby-config.js`).catch(() => {})
    ), // ignore as this file isn't required),
    Promise.resolve(
      md5File(`${program.directory}/gatsby-node.js`).catch(() => {})
    ), // ignore as this file isn't required),
  ])
  const pluginsHash = crypto
    .createHash(`md5`)
    .update(JSON.stringify(pluginVersions.concat(hashes)))
    .digest(`hex`)
  const oldPluginsHash = state && state.status ? state.status.PLUGINS_HASH : ``

  // Check if anything has changed. If it has, delete the site's .cache
  // directory and tell reducers to empty themselves.
  //
  // Also if the hash isn't there, then delete things just in case something
  // is weird.
  if (oldPluginsHash && pluginsHash !== oldPluginsHash) {
    report.info(report.stripIndent`
      One or more of your plugins have changed since the last time you ran Gatsby. As
      a precaution, we're deleting your site's cache to ensure there's no stale data.
    `)
  }

  if (!oldPluginsHash || pluginsHash !== oldPluginsHash) {
    try {
      // Attempt to empty dir if remove fails,
      // like when directory is mount point
      await fs.remove(cacheDirectory).catch(() => fs.emptyDir(cacheDirectory))
    } catch (e) {
      report.error(`Failed to remove .cache files.`, e)
    }
    // Tell reducers to delete their data (the store will already have
    // been loaded from the file system cache).
    store.dispatch({
      type: `DELETE_CACHE`,
    })
  }

  // Update the store with the new plugins hash.
  store.dispatch({
    type: `UPDATE_PLUGINS_HASH`,
    payload: pluginsHash,
  })

  store.dispatch({
    type: `UPDATE_CACHE_KEYS`,
    payload: updatedCacheKeys,
  })

  // Now that we know the .cache directory is safe, initialize the cache
  // directory.
  await fs.ensureDir(cacheDirectory)

  // Ensure the public/static directory
  await fs.ensureDir(`${program.directory}/public/static`)
}
