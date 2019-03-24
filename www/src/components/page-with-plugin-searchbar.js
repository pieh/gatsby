import React, { Fragment } from "react"
import PluginSearchBar from "./plugin-searchbar-body"
import { rhythm } from "../utils/typography"
import { colors, breakpoints, dimensions } from "../utils/presets"

const PageWithPluginSearchBar = ({ isPluginsIndex, location, children }) => (
  <Fragment>
    <section
      css={{
        ...styles.sidebar,
        // mobile: hide PluginSearchBar when on gatsbyjs.org/packages/foo, aka package README page
        display: !isPluginsIndex ? `none` : false,
      }}
    >
      <PluginSearchBar location={location} />
    </section>
    <main
      id={`reach-skip-nav`}
      css={{
        ...styles.content,
        // mobile: hide README on gatsbyjs.org/plugins index page
        display: isPluginsIndex ? `none` : false,
      }}
    >
      {children}
    </main>
  </Fragment>
)

const widthDefault = rhythm(14)
const widthLarge = rhythm(16)

const styles = {
  sidebar: {
    height: `calc(100vh - ${dimensions.headerHeight})`,
    width: `100%`,
    zIndex: 1,
    top: `calc(${dimensions.headerHeight} + ${dimensions.bannerHeight} - 1px)`,
    [breakpoints.md]: {
      display: `block`,
      width: widthDefault,
      position: `fixed`,
      background: colors.white,
      borderRight: `1px solid ${colors.gray.border}`,
    },
    [breakpoints.lg]: {
      width: widthLarge,
    },
  },
  content: {
    [breakpoints.md]: {
      display: `block`,
      paddingLeft: widthDefault,
    },
    [breakpoints.lg]: {
      paddingLeft: widthLarge,
    },
  },
}

export default PageWithPluginSearchBar
