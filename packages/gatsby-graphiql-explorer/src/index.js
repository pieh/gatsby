const path = require(`path`)

module.exports = (
  expressApp,
  {
    graphqlEndpoint,
    getFragments,
    getPagesByTemplate,
    getPageQueryAndContext,
    savePageQuery,
    express,
  }
) => {
  const bundleUrlHandler = path.posix.join(graphqlEndpoint, `app.js`)
  const fragmentsUrlHandler = path.posix.join(graphqlEndpoint, `fragments`)
  const pagesUrlHandler = path.posix.join(graphqlEndpoint, `pages/:search?`)
  const pageContextAndQueryUrlHandler = path.posix.join(
    graphqlEndpoint,
    `page-details`
  )
  const queryUpdateUrlHandler = path.posix.join(graphqlEndpoint, `query-update`)

  expressApp.get(bundleUrlHandler, (req, res) => {
    res.set(`Cache-Control`, `public, max-age=31557600`)
    res.sendFile(path.join(__dirname, `app.js`))
  })

  expressApp.get(graphqlEndpoint, (req, res) => {
    res.sendFile(path.join(__dirname, `index.html`))
  })

  expressApp.get(fragmentsUrlHandler, (req, res) => {
    // getFragments might not be passed if older gatsby core version is used
    // so checking before calling it
    res.json(getFragments ? getFragments() : [])
  })

  const hasPageSupport =
    getPagesByTemplate && getPageQueryAndContext && savePageQuery

  expressApp.get(pagesUrlHandler, (req, res) => {
    res.json(
      hasPageSupport ? getPagesByTemplate({ filter: req?.params?.search }) : []
    )
  })

  expressApp.get(pageContextAndQueryUrlHandler, (req, res) => {
    res.json(
      hasPageSupport ? getPageQueryAndContext({ page: req?.query?.page }) : []
    )
  })

  expressApp.post(queryUpdateUrlHandler, express.json(), async (req, res) => {
    res.json(hasPageSupport ? await savePageQuery(req?.body) : [])
  })
}
