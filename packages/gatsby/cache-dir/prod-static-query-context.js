import React from "react"
import emitter from "./emitter"
import { StaticQueryContext } from "gatsby"

// for initial hydration we wait for resources before mounting, so need to listen
// for static query results outside of component (yikes)

const staticQueries = {}

let callback

emitter.on(`static-query-result`, event => {
  event.staticQueriesFetchResults.forEach(
    ({ staticQueryHash, jsonPayload }) => {
      staticQueries[staticQueryHash] = jsonPayload
    }
  )
  if (callback) {
    callback()
  }
})

// Minimum react version is 16.3 so no hooks :(((
export class ProductionStaticQueryContext extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      staticQueries,
    }
  }

  componentDidMount() {
    callback = () => {
      // force re-render
      this.setState({ staticQueries })
    }
  }

  render() {
    console.log(`[prod-static-query-context] render`, this.state.staticQueries)
    return (
      <StaticQueryContext.Provider value={this.state.staticQueries}>
        {this.props.children}
      </StaticQueryContext.Provider>
    )
  }
}
