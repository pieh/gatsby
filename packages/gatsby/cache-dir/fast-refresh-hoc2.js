import React from "react"

function FastRefreshHoc(PageTemplate) {
  const Component = props => {
    return <PageTemplate {...props} />
  }
  return Component
}

export { FastRefreshHoc }
