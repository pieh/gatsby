const fs = require(`fs`)
const path = require(`path`)

const ignore = [`.DS_Store`, `.gitignore`, `README.md`]

const packagesDir = path.join(__dirname, `..`, `packages`)
const versions = {}
fs.readdirSync(packagesDir)
  .filter(dir => !ignore.includes(dir))
  .forEach(pkgName => {
    const absPath = path.join(__dirname, `../packages/${pkgName}/package.json`)
    const ver = require(absPath).version
    versions[pkgName] = ver
  })

const examplesDir = path.join(__dirname, `..`, `examples`)

const exampleSitesAbsPaths = fs
  .readdirSync(examplesDir)
  .filter(dir => !ignore.includes(dir))

const setGatsbyDepsToCurrentCaretVersion = (absPath, siteName) => {
  console.log(`Site: ${siteName}`)
  const pkg = require(absPath)
  let changed = false
  ;[`dependencies`, `devDependencies`].forEach(key => {
    if (key in pkg) {
      Object.keys(pkg[key]).forEach(depName => {
        if (depName in versions) {
          console.log(
            ` - [${key}] ${depName}: ${pkg[key][depName]} -> ^${
              versions[depName]
            } `
          )
          pkg[key][depName] = `^${versions[depName]}`
          changed = true
        }
      })
    }
  })

  if (changed) {
    fs.writeFileSync(absPath, JSON.stringify(pkg, null, 2))
  }
}

exampleSitesAbsPaths.forEach(example => {
  setGatsbyDepsToCurrentCaretVersion(
    path.join(__dirname, `../examples/${example}/package.json`),
    example
  )
})

setGatsbyDepsToCurrentCaretVersion(
  path.join(__dirname, `../www/package.json`),
  `gatsbyjs.org`
)
