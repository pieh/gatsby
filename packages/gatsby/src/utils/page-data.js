const fs = require(`fs-extra`)
const path = require(`path`)

const getFilePath = ({ publicDir }, pagePath) => {
  const fixedPagePath = pagePath === `/` ? `index` : pagePath
  return path.join(publicDir, `page-data`, fixedPagePath, `page-data.json`)
}
const read = async ({ publicDir }, pagePath) => {
  const filePath = getFilePath({ publicDir }, pagePath)
  const rawPageData = await fs.readFile(filePath, `utf-8`)
  return JSON.parse(rawPageData)
}

const write = async ({ publicDir }, page, result, component) => {
  const filePath = getFilePath({ publicDir }, page.path)
  const body = {
    componentChunkName: page.componentChunkName,
    path: page.path,
    matchPath: page.matchPath,
    staticQueries: component
      ? component.staticQueries
        ? Array.from(component.staticQueries.values())
        : undefined
      : undefined,
    result,
  }

  await fs.outputFile(filePath, JSON.stringify(body))
}

module.exports = {
  read,
  write,
}
