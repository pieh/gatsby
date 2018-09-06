import React, { createElement } from "react"
import PropTypes from "prop-types"
import { publicLoader } from "./loader"

import { apiRunner } from "./api-runner-browser"

class PageRenderer extends React.Component {
  render() {
    const pathContext =
      process.env.NODE_ENV !== `production`
        ? this.props.pageContext
        : this.props.pageResources.json.pageContext

    const props = {
      ...this.props,
      ...this.props.pageResources.json,
      pathContext,
    }

    const [replacementElement] = apiRunner(`replaceComponentRenderer`, {
      props: { ...this.props, pageResources: this.props.pageResources },
      loader: publicLoader,
    })

    const pageElement =
      replacementElement ||
      createElement(this.props.pageResources.component, props)

    const wrappedPage = apiRunner(
      `wrapPageElement`,
      { element: pageElement, props },
      pageElement,
      ({ result }) => {
        return { element: result, props }
      }
    ).pop()

    return wrappedPage
  }
}

PageRenderer.propTypes = {
  location: PropTypes.object,
  pageResources: PropTypes.object,
  pageContext: PropTypes.object,
}

export default PageRenderer
