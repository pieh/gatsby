// import md5File from "md5-file/promise"
// import crypto from "crypto"
// import fs from "fs-extra"
// import report from "gatsby-cli/lib/reporter"
// import { isEmpty } from "lodash"

import {
  registerConfigKey,
  collectConfigKeyChanges,
  ConfigKeyValueType,
} from "./configuration-keys"
import { store } from "../../../redux"
// import { getPlugin}
import { collectPluginChanges } from "./plugin-versions"
import { FlattenedPlugins } from "../types"

interface DependecyAndConfigurationChanges {
  isFirstRun: boolean
  changedCacheKeys: string[]
  cacheKeys: { [key: string]: ConfigKeyValueType }
  pluginVersions: { [key: string]: string }
  changedPlugins: Array<string>
}

export const collectDependencyAndConfigurationChanges = ({
  flattenedPlugins,
}: // cacheDirectory,
{
  flattenedPlugins: FlattenedPlugins
  // cacheDirectory: string
}): DependecyAndConfigurationChanges => {
  const state = store.getState()

  registerConfigKey(`dbNodes`, () => {
    return process.env.GATSBY_DB_NODES || `redux`
  })

  registerConfigKey(`pathPrefix`, () => {
    return state.program.prefixPaths ? state.config.pathPrefix : ``
  })

  registerConfigKey(`experimentalSelectiveHtmlBuilds`, () => {
    return !!process.env.GATSBY_EXPERIMENTAL_PAGE_BUILD_ON_DATA_CHANGES
  })

  // this is to invalidate persisted data if `gatsby` version changed
  // there might be changes to how we store data so safe thing to do is to invalidate everything
  // further down the line we might think about separate redux schema versioning, so we wouldn't have
  // to invalidate on each change, and only when there is actual data shape changes
  registerConfigKey(`coreVersion`, () => {
    const coreVersion = require(`gatsby/package.json`).version
    return coreVersion
  })

  const isFirstRun = !state.status.loadedFromCache

  // Check if any plugins or cache keys have changed since our last run
  const { changedCacheKeys, cacheKeys } = collectConfigKeyChanges(state)
  const { changedPlugins, pluginVersions } = collectPluginChanges(
    flattenedPlugins,
    state
  )

  return {
    isFirstRun,
    cacheKeys,
    changedCacheKeys,
    pluginVersions,
    changedPlugins,
  }

  // const shouldInvalidateCache =
  //   changedCacheKeys.length > 0 || changedPlugins.length > 0

  // // clear .cache directory if there were any changes detected
  // if (shouldInvalidateCache) {
  //   if (!isFirstRun) {
  //     // Display message only if current state was loaded from cache.
  //     // Otherwise it will be confusing to users that they see message
  //     // on clean clone / after deleting .cache directory
  //     report.info(report.stripIndent`
  //       One or more of your plugins have changed since the last time you ran Gatsby. As
  //       a precaution, we're deleting your site's cache to ensure there's no stale data.
  //     `)
  //   }

  //   try {
  //     // Attempt to empty dir if remove fails,
  //     // like when directory is mount point
  //     await fs.remove(cacheDirectory).catch(() => fs.emptyDir(cacheDirectory))
  //   } catch (e) {
  //     report.error(`Failed to remove .cache files.`, e)
  //   }

  //   // Tell reducers to delete their data (the store will already have
  //   // been loaded from the file system cache).
  //   store.dispatch({
  //     type: `DELETE_CACHE`,
  //     payload: {
  //       changedPlugins,
  //       changedCacheKeys,
  //     },
  //   })

  //   // store cache keys and plugin versions used for this run to have data
  //   // for next run to decide wether cache need to be invalidated or not
  //   store.dispatch({
  //     type: `UPDATE_CACHE_STATUS`,
  //     payload: {
  //       pluginVersions,
  //       cacheKeys,
  //     },
  //   })
  // }

  // return { wasInvalidated: shouldInvalidateCache }
}
