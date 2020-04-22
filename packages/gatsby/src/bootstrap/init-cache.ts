import { maybeInvalidateCache } from "./cache-invalidation"
import report from "gatsby-cli/lib/reporter"
import * as path from "path"

import { FlattenedPlugins } from "./cache-invalidation/types"
import { Span } from "opentracing"

export const initCache = async ({
  flattenedPlugins: FlattenedPlugins,
  cacheDirectory: string,
  parentSpan: Span,
}) => {
  const activity = report.activityTimer(`initialize cache`, {
    parentSpan,
  })
  activity.start()

  if (process.env.GATSBY_DB_NODES === `loki`) {
    const loki = require(`../db/loki`)
    // Start the nodes database (in memory loki js with interval disk
    // saves). If data was saved from a previous build, it will be
    // loaded here
    const lokiActivity = report.activityTimer(`start nodes db`, {
      parentSpan: activity.span,
    })
    lokiActivity.start()
    const dbSaveFile = `${cacheDirectory}/loki/loki.db`
    try {
      await loki.start({
        saveFile: dbSaveFile,
      })
    } catch (e) {
      report.error(
        `Error starting DB. Perhaps try deleting ${path.dirname(dbSaveFile)}`
      )
    }

    lokiActivity.end()
  }

  await maybeInvalidateCache({
    flattenedPlugins,
    cacheDirectory,
  })

  // if (changes.length > 0) {
  //   store.dispatch({
  //     type: `DELETE_CACHE`,
  //     payload: changes,
  //   })
  // }

  // store.dispatch({
  //   type: `UPDATE_PLUGINS_HASH`,
  //   payload: JSON.stringify(hash),
  // })

  // if (process.env.GATSBY_DB_NODES !== `loki`) {
  //   store.dispatch({
  //     type: `REBUILD_NODES_BY_TYPE`,
  //     payload: store.getState().nodes,
  //   })
  // }

  // Now that we know the .cache directory is safe, initialize the cache
  // directory.
  // await fs.ensureDir(cacheDirectory)

  // Ensure the public/static directory
  // await fs.ensureDir(`${program.directory}/public/static`)

  activity.end()
}
