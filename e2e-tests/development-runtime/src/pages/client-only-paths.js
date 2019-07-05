import React from "react"
import { Router } from "@reach/router"
import { Link, graphql } from "gatsby"

import Layout from "../components/layout"
import InstrumentPage from "../utils/instrument-page"

const Page = props => (
  <pre data-testid="dom-marker">[client-only-path] {props.page}</pre>
)

const NestedRouterRoute = props => <pre>{JSON.stringify(props, null, 2)}</pre>

const PageWithNestedRouter = props => {
  console.log(`nested`, props)
  return (
    <React.Fragment>
      <pre data-testid="dom-marker">[client-only-path] nested</pre>
      <Router>
        <NestedRouterRoute path="/" />
        <NestedRouterRoute path="/foo" />
        <NestedRouterRoute path="/bar" />
      </Router>
    </React.Fragment>
  )
}

const routes = [
  `/`,
  `/profile`,
  `/dashboard`,
  `/nested`,
  `/nested/foo`,
  `/nested/bar`,
]

const basePath = `/client-only-paths`

const ClientOnlyPathPage = () => (
  <Layout>
    <Router id="client-only-paths-sub-router">
      <Page path="/client-only-paths/" page="index" />
      <PageWithNestedRouter path="/client-only-paths/nested/*" />
      <Page path="/client-only-paths/:page" />
    </Router>
    <ul>
      {routes.map(route => (
        <li key={route}>
          <Link to={`${basePath}${route}`} data-testid={route}>
            {route}
          </Link>
        </li>
      ))}
    </ul>
  </Layout>
)

export default InstrumentPage(ClientOnlyPathPage)
