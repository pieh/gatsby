import React from "react"
import { Router, Location, BaseContext } from "@reach/router"
import { ScrollContext } from "gatsby-react-router-scroll"

import {
  shouldUpdateScroll,
  init as navigationInit,
  RouteUpdates,
} from "./navigation"
import { apiRunner } from "./api-runner-browser"
import loader from "./loader"
import { PageQueryStore, StaticQueryStore } from "./query-result-store"
import EnsureResources from "./ensure-resources"

import { reportError, clearError } from "./error-overlay-handler"

let registeredReloadListeners = false
function setupReloadListeners() {
  // react runtime error
  if (registeredReloadListeners) {
    return
  }

  console.log(`setting up reload listeners`)

  // Inspired by `react-dev-utils` HMR client:
  // If there was unhandled error, reload browser
  // on next HMR update
  module.hot.addStatusHandler(status => {
    if (status === `apply` || status === `idle`) {
      window.location.reload()
    }
  })

  // Additionally in Gatsby case query result updates can cause
  // runtime error and also fix them, so reload on data updates
  // as well
  ___emitter.on(`pageQueryResult`, () => {
    window.location.reload()
  })
  ___emitter.on(`staticQueryResult`, () => {
    window.location.reload()
  })

  registeredReloadListeners = true
}
class RuntimeErrorBoundary extends React.Component {
  // this is for errors that happen when not applying HMR
  componentDidCatch(error, info) {
    console.log(`[componentDidCatch] attaching reload listeners`, {
      error,
      info,
    })
    setupReloadListeners()
  }

  render() {
    return this.props.children
  }
}

// TODO: Remove entire block when we make fast-refresh the default
// In fast-refresh, this logic is all moved into the `error-overlay-handler`
if (
  window.__webpack_hot_middleware_reporter__ !== undefined &&
  process.env.GATSBY_HOT_LOADER !== `fast-refresh`
) {
  const { setConfig } = require(`react-hot-loader`)
  setConfig({
    // this is for errors that happen when applying HMR
    ErrorOverlay: props => {
      console.log(`[ErrorOverlay] attaching reload listeners`, props)
      if (props.errors && props.errors.length > 0) {
        setupReloadListeners()
      }
      return null
    },
  })

  const overlayErrorID = `webpack`
  // Report build errors
  window.__webpack_hot_middleware_reporter__.useCustomOverlay({
    showProblems(type, obj) {
      if (type !== `errors`) {
        clearError(overlayErrorID)
        return
      }
      reportError(overlayErrorID, obj[0])
    },
    clear() {
      clearError(overlayErrorID)
    },
  })
}

navigationInit()

// In gatsby v2 if Router is used in page using matchPaths
// paths need to contain full path.
// For example:
//   - page have `/app/*` matchPath
//   - inside template user needs to use `/app/xyz` as path
// Resetting `basepath`/`baseuri` keeps current behaviour
// to not introduce breaking change.
// Remove this in v3
const RouteHandler = props => (
  <BaseContext.Provider
    value={{
      baseuri: `/`,
      basepath: `/`,
    }}
  >
    <PageQueryStore {...props} />
  </BaseContext.Provider>
)

class LocationHandler extends React.Component {
  render() {
    const { location } = this.props

    if (!loader.isPageNotFound(location.pathname)) {
      return (
        <EnsureResources location={location}>
          {locationAndPageResources => (
            <RouteUpdates location={location}>
              <ScrollContext
                location={location}
                shouldUpdateScroll={shouldUpdateScroll}
              >
                <Router
                  basepath={__BASE_PATH__}
                  location={location}
                  id="gatsby-focus-wrapper"
                >
                  <RouteHandler
                    path={encodeURI(
                      locationAndPageResources.pageResources.page.matchPath ||
                        locationAndPageResources.pageResources.page.path
                    )}
                    {...this.props}
                    {...locationAndPageResources}
                  />
                </Router>
              </ScrollContext>
            </RouteUpdates>
          )}
        </EnsureResources>
      )
    }

    const dev404PageResources = loader.loadPageSync(`/dev-404-page`)
    const real404PageResources = loader.loadPageSync(`/404.html`)
    let custom404
    if (real404PageResources) {
      custom404 = (
        <PageQueryStore {...this.props} pageResources={real404PageResources} />
      )
    }

    return (
      <RouteUpdates location={location}>
        <Router
          basepath={__BASE_PATH__}
          location={location}
          id="gatsby-focus-wrapper"
        >
          <RouteHandler
            path={location.pathname}
            location={location}
            pageResources={dev404PageResources}
            custom404={custom404}
          />
        </Router>
      </RouteUpdates>
    )
  }
}

const Root = () => (
  <Location>
    {locationContext => <LocationHandler {...locationContext} />}
  </Location>
)

// Let site, plugins wrap the site e.g. for Redux.
const WrappedRoot = apiRunner(
  `wrapRootElement`,
  { element: <Root /> },
  <Root />,
  ({ result, plugin }) => {
    return { element: result }
  }
).pop()

export default () => {
  let root = <StaticQueryStore>{WrappedRoot}</StaticQueryStore>

  if (process.env.GATSBY_HOT_LOADER !== `fast-refresh`) {
    return <RuntimeErrorBoundary>{root}</RuntimeErrorBoundary>
  }
  return root
}
