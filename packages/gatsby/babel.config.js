// This being a babel.config.js file instead of a .babelrc file allows the
// packages in `internal-plugins` to be compiled with the rest of the source.
// Ref: https://github.com/babel/babel/pull/7358
const path = require(`path`)
const configPath = path.join(__dirname, `..`, `..`, `.babelrc.js`)

const config = require(configPath)

const rawFileTest = /[\\/]raw_[^\\/]+$/
config.ignore.push(pathToTest => rawFileTest.test(pathToTest))

module.exports = config
