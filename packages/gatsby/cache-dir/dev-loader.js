import { BaseLoader, PageResourceStatus } from "./loader"
import { findPath } from "./find-path"
import { getPageData } from "./socketIo"

class DevLoader extends BaseLoader {
  constructor(syncRequires, matchPaths) {
    const loadComponent = chunkName =>
      Promise.resolve(syncRequires.components[chunkName])
    super(loadComponent, matchPaths)
  }

  // Disable gatsby-link prefetch/preload
  async doPrefetch(pagePath) {
    // don't do anything
  }
  async hovering(rawPath) {
    // don't do anything
  }

  async fetchPageDataJson(loadObj) {
    const { pagePath } = loadObj

    const pageData = await getPageData(pagePath)

    // console.log(`[dev-loader] got pageData`, { pageData, loadObj })

    if (!pageData) {
      if (pagePath === `/404.html`) {
        return { ...loadObj, status: PageResourceStatus.Error }
      }

      return this.fetchPageDataJson({
        ...loadObj,
        pagePath: `/404.html`,
        notFound: true,
      })
    }

    return {
      ...loadObj,
      status: PageResourceStatus.Success,
      payload: pageData,
    }
  }

  // this route all page-data request through websocket and not xhr/fetch
  async loadPageDataJson(rawPath) {
    const pagePath = findPath(rawPath)
    const data = await this.fetchPageDataJson({ pagePath })

    if (
      data.status === PageResourceStatus.Error &&
      rawPath !== `/dev-404-page/`
    ) {
      console.error(
        `404 page could not be found. Checkout https://www.gatsbyjs.org/docs/add-404-page/`
      )
      return this.loadPageDataJson(`/dev-404-page/`).then(result =>
        Object.assign({}, data, result)
      )
    }

    return data
  }
}

export default DevLoader
