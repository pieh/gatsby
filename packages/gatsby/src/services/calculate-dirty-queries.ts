import { calcDirtyQueryIds, groupQueryIds } from "../query"
import { IGroupedQueryIds } from "./"
import { IQueryRunningContext } from "../state-machines/query-running/types"
import { assertStore } from "../utils/assert-store"
import reporter from "gatsby-cli/lib/reporter"

export async function calculateDirtyQueries({
  store,
  websocketManager,
}: Partial<IQueryRunningContext>): Promise<{
  queryIds: IGroupedQueryIds
}> {
  assertStore(store)

  const state = store.getState()
  const queryIds = calcDirtyQueryIds(state)
  let queriesToRun: Array<string> = queryIds

  reporter.verbose(`Dirty queries: ${JSON.stringify(Array.from(queryIds))}`)

  if (process.env.gatsby_executing_command === `develop`) {
    // 404 are special cases in our runtime that ideally use
    // generic things to work, but for now they have special handling
    const filter = new Set([`/404.html`, `/dev-404-page/`])
    if (websocketManager?.activePaths) {
      websocketManager.activePaths.forEach(filter.add.bind(filter))
    }
    const pendingPaths = websocketManager?.pendingPathPromises?.keys()
    if (pendingPaths) {
      for (const path of pendingPaths) {
        filter.add(path)
      }
    }

    reporter.verbose(`Filter: ${JSON.stringify(Array.from(filter))}`)

    queriesToRun = queryIds.filter(
      queryId => filter.has(queryId) || queryId.startsWith(`sq--`)
    )
  }

  reporter.verbose(`Queries to run: ${JSON.stringify(queriesToRun)}`)

  return {
    queryIds: groupQueryIds(queriesToRun),
  }
}
