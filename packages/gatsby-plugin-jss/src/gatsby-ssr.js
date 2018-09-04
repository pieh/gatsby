import React from "react"
import { JssProvider, SheetsRegistry, ThemeProvider } from "react-jss"

const sheetsMap = new Map()

// eslint-disable-next-line react/prop-types,react/display-name
exports.wrapRootElement = ({ element, pathname }, { theme = {} }) => {
  const sheets = new SheetsRegistry()
  sheetsMap.set(pathname, sheets)
  return (
    <JssProvider registry={sheets}>
      <ThemeProvider theme={theme}>{element}</ThemeProvider>
    </JssProvider>
  )
}

exports.onRenderBody = ({ setHeadComponents, pathname }) => {
  setHeadComponents([
    <style
      type="text/css"
      id="server-side-jss"
      key="server-side-jss"
      dangerouslySetInnerHTML={{ __html: sheetsMap.get(pathname).toString() }}
    />,
  ])
}
