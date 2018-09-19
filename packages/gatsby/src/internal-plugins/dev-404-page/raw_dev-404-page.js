import React from "react"
import PropTypes from "prop-types"
import { Link, graphql } from "gatsby"

class Dev404Page extends React.Component {
  static propTypes = {
    pages: PropTypes.arrayOf(PropTypes.object),
    location: PropTypes.object,
  }
  render() {
    const { pathname } = this.props.location
    const pages = this.props.data.allSitePage.edges.map(({ node }) => node)
    let newFilePath
    if (pathname === `/`) {
      newFilePath = `src/pages/index.js`
    } else if (pathname.slice(-1) === `/`) {
      newFilePath = `src/pages${pathname.slice(0, -1)}.js`
    } else {
      newFilePath = `src/pages${pathname}.js`
    }
    return (
      <div>
        <h1>Gatsby.js development 404 page</h1>
        <p>
          {`There's not a page yet at `}
          <code>{pathname}</code>
        </p>
        <p>
          Create a React.js component in your site directory at
          {` `}
          <code>{newFilePath}</code>
          {` `}
          and this page will automatically refresh to show the new page
          component you created.
        </p>
        {pages.length > 0 && (
          <div>
            <p>
              If you were trying to reach another page, perhaps you can find it
              below.
            </p>
            <h2>Pages ({pages.length})</h2>
            <ul>
              {pages.map(page => (
                <li key={page.path}>
                  <Link to={page.path}>{page.path}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }
}

export default Dev404Page

export const query = graphql`
  query what {
    allSitePage(filter: { path: { ne: "/dev-404-page/" } }) {
      edges {
        node {
          path
        }
      }
    }
  }
`
