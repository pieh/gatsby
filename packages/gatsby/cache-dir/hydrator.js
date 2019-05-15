const preferDefault = m => (m && m.default) || m

if (
  process.env.BUILD_STAGE === `build-html` ||
  process.env.BUILD_STAGE === `develop-html`
) {
  module.exports = preferDefault(require(`./hydrator-ssr`))
} else if (
  process.env.BUILD_STAGE === `build-javascript` ||
  process.env.BUILD_STAGE === `develop`
) {
  module.exports = preferDefault(require(`./hydrator-js`))
} else {
  module.exports = () => null
}
