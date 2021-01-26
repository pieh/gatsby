import fs from "fs-extra"
import path from "path"

import { IGatsbyState } from "../redux/types"
import { store } from "../redux"

const checkForHtmlSuffix = (pagePath: string): boolean =>
  !/\.(html?)$/i.test(pagePath)

// copied from https://github.com/markdalgleish/static-site-generator-webpack-plugin/blob/master/index.js#L161
export const getPageHtmlFilePath = (
  dir: string,
  outputPath: string
): string => {
  let outputFileName = outputPath.replace(/^(\/|\\)/, ``) // Remove leading slashes for webpack-dev-server

  if (checkForHtmlSuffix(outputPath)) {
    outputFileName = path.join(outputFileName, `index.html`)
  }

  return path.join(dir, outputFileName)
}

export const remove = async (
  { publicDir }: { publicDir: string },
  pagePath: string
): Promise<void> => {
  const filePath = getPageHtmlFilePath(publicDir, pagePath)
  if (fs.existsSync(filePath)) {
    return await fs.remove(filePath)
  }
  return Promise.resolve()
}

export function calcDirtyHtmlFiles(
  state: IGatsbyState
): { toRegenerate: Array<string>; toDelete: Array<string> } {
  const toRegenerate: Array<string> = []
  const toDelete: Array<string> = []

  state.html.trackedHtmlFiles.forEach(function (htmlFile, path) {
    if (htmlFile.isDeleted || !state.pages.has(path)) {
      // FIXME: checking pages state here because pages are not persisted
      // and because of that `isDeleted` might not be set ...
      toDelete.push(path)
    } else if (htmlFile.dirty) {
      toRegenerate.push(path)
    }
  })

  return {
    toRegenerate,
    toDelete,
  }
}

export function markHtmlDirtyIfResultOfUsedStaticQueryChanged(): void {
  const state = store.getState()

  const dirtyStaticQueryResults = new Set<string>()
  state.html.trackedStaticQueryResults.forEach(function (
    staticQueryResultState,
    staticQueryHash
  ) {
    if (staticQueryResultState.dirty) {
      dirtyStaticQueryResults.add(staticQueryHash)
    }
  })

  // we have dirty static query hashes - now we need to find templates that use them
  const dirtyTemplates = new Set<string>()
  state.staticQueriesByTemplate.forEach(function (
    staticQueryHashes,
    componentPath
  ) {
    for (const dirtyStaticQueryHash of dirtyStaticQueryResults) {
      if (staticQueryHashes.includes(dirtyStaticQueryHash)) {
        dirtyTemplates.add(componentPath)
        break // we already know this template need to rebuild, no need to check rest of queries
      }
    }
  })

  // mark html as dirty
  const dirtyPages = new Set<string>()
  for (const dirtyTemplate of dirtyTemplates) {
    const component = state.components.get(dirtyTemplate)
    for (const page of component.pages) {
      dirtyPages.add(page)
    }
  }

  store.dispatch({
    type: `HTML_MARK_DIRTY_BECAUSE_STATIC_QUERY_RESULT_CHANGED`,
    payload: {
      pages: dirtyPages,
      staticQueryHashes: dirtyStaticQueryResults,
    },
  })
}
