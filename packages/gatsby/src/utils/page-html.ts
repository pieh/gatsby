import fs from "fs-extra"
import path from "path"

import { IGatsbyState } from "../redux/types"

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
