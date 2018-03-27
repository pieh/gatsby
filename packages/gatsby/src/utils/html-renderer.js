const Queue = require(`better-queue`)
const fs = require(`fs-extra`)
const path = require(`path`)

// copied from https://github.com/markdalgleish/static-site-generator-webpack-plugin/blob/master/index.js#L161
const generatePathToOutput = outputPath => {
  let outputFileName = outputPath.replace(/^(\/|\\)/, ``) // Remove leading slashes for webpack-dev-server

  if (!/\.(html?)$/i.test(outputFileName)) {
    outputFileName = path.join(outputFileName, `index.html`)
  }

  return path.join(process.cwd(), `public`, outputFileName)
}

module.exports = (htmlComponentRenderer, pages) =>
  new Promise(resolve => {
    const queue = new Queue(
      (path, cb) => {
        // use static-site-generator-webpack-plugin compatible function
        htmlComponentRenderer.default({ path }, (throwAway, htmlString) => {
          fs.outputFile(generatePathToOutput(path), htmlString).then(() => {
            cb()
          })
        })
      },
      {
        concurrent: 20,
      }
    )

    pages.forEach(page => {
      queue.push(page)
    })

    queue.on(`drain`, () => {
      resolve()
    })
  })
