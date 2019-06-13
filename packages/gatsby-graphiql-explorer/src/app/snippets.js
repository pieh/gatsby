import React, { useState } from "react"
// import { Dialog, DialogOverlay, DialogContent } from "@reach/dialog"
// import "@reach/dialog/styles.css"
import Select from "react-select"

const addIndent = (text, indent) =>
  text
    .split(`\n`)
    .map(line => `${indent}${line}`)
    .join(`\n`)

const pathFieldOptions = {
  "frontmatter.title": {
    label: `frontmatter > title`,
    gatsbyNodeFragment: `frontmatter {
  title
}`,
  },
  "fields.slug": {
    label: `fields > slug`,
    gatsbyNodeFragment: `fields {
  slug
}`,
  },
  excerpt: {
    label: `excerpt`,
    gatsbyNodeFragment: `excerpt`,
  },
  html: {
    label: `html`,
    gatsbyNodeFragment: `html`,
  },
}

const selectOptions = Object.entries(pathFieldOptions).map(
  ([value, { label }]) => {
    return {
      label,
      value,
    }
  }
)

const P = props => (
  <p
    style={{
      borderBottom: `none`,
      display: `block`,
      whiteSpace: `unset`,
      cursor: `auto`,
    }}
    {...props}
  />
)

export default [
  {
    name: `Page listing`,
    // language: `JavaScript`,
    codeMirrorMode: `jsx`,
    options: [],
    generate: arg => {
      const { serverUrl, operationDataList, options, headers, context } = arg
      console.log(arg)

      const { query } = operationDataList[0]

      return `import React from "react"
import { graphql } from "gatsby"

export default ({ data }) => <pre>{JSON.stringify(data, null, 4)}</pre>

export const query = graphql\`
${query}
\`
`
    },
    customView: function(arg) {
      const [open, setOpen] = useState(false)
      const [path, setPath] = useState(``)
      const [pathField, setPathField] = useState(`frontmatter.title`)
      const [detailedFields, setDetailedFields] = useState([])
      const [listingFields, setListingFields] = useState([])

      console.log(`customView`, {
        arg,
        that: this,
        open,
        setOpen,
        // detailedFields,
      })

      const gatsbyNode = `const results = await graphql(\`
  {
    allMarkdownRemark {
      nodes {
        id
${addIndent(pathFieldOptions[pathField].gatsbyNodeFragment, `        `)}
      }
    }
  }
\`)

if (results.errors) {
  throw results.errors
}

debugger;
console.log(results)

results.data.allMarkdownRemark.nodes.forEach(node => {
  const pagePath = \`${path}$\{node.${pathField}}\`
  const pageObj = {
    path: pagePath,
    component: path.resolve(\`./src/templates/blog-post.js\`),
    context: {
      id: node.id,
    },
  }
  console.log('creating page', pageObj)
  actions.createPage(pageObj)
})`

      const template = `import React from "react"
import { graphql } from "gatsby"

export default ({ data }) => (
  <pre>
    {JSON.stringify(data, null, 4)}
  </pre>
)

export const query = graphql\`
  query($id:String!) {
    markdownRemark(id: {eq: $id}) {
${addIndent(
  detailedFields
    .map(field => pathFieldOptions[field].gatsbyNodeFragment)
    .join(`\n`),
  `      `
)}
    }
  }
\``

      const tmpListingFields = [...listingFields]
      if (!tmpListingFields.includes(pathField)) {
        tmpListingFields.push(pathField)
      }

      const listing = `import React from "react"
import { graphql, Link } from "gatsby"

export default ({ data }) => (
  <pre>
    <ul>
      {data.allMarkdownRemark.nodes.map(node => (
        <li key={node.${pathField}}>
          <pre>
            {JSON.stringify(node, null, 4)}
          </pre>
          <Link to={\`${path}/$\{node.${pathField}}\`}>See details</Link>
        </li>
      ))}
    </ul>
  </pre>
)

export const query = graphql\`
  query {
    allMarkdownRemark {
      nodes {
${addIndent(
  tmpListingFields
    .map(field => pathFieldOptions[field].gatsbyNodeFragment)
    .join(`\n`),
  `        `
)}
      }
    }
  }
\``

      const listingFile = path.replace(/^\/*/, ``)

      const {
        serverUrl,
        operationDataList,
        options,
        headers,
        context,
        CodeDisplay,
      } = arg
      return (
        <React.Fragment>
          <form
            style={{
              position: `sticky`,
              top: 0,
              background: `white`,
              zIndex: 99,
            }}
            onSubmit={e => {
              e.preventDefault()
              arg.context.socket.emit(`injectSnippets`, {
                gatsbyNode,
                template,
                templateFile: `src/templates/blog-post.js`,
                listing,
                listingFile: `src/pages/${listingFile}.js`,
              })
            }}
          >
            <fieldset>
              <legend>Options</legend>
              <div>
                <label>
                  Path for listing page:{` `}
                  <input
                    type="text"
                    placeholder="/blog"
                    name="path"
                    value={path}
                    onChange={e => setPath(e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label>
                  Field used to create page paths:{` `}
                  <Select
                    onChange={selectedOption => {
                      setPathField(selectedOption.value)
                    }}
                    options={selectOptions}
                  />
                </label>
              </div>
              <div>
                <label>
                  Fields available in detailed page:{` `}
                  <Select
                    onChange={selectedOptions => {
                      setDetailedFields(
                        selectedOptions.map(option => option.value)
                      )
                    }}
                    options={selectOptions}
                    isMulti={true}
                  />
                </label>
              </div>
              <div>
                <label>
                  Fields available in listing page:{` `}
                  <Select
                    onChange={selectedOptions => {
                      setListingFields(
                        selectedOptions.map(option => option.value)
                      )
                    }}
                    options={selectOptions}
                    isMulti={true}
                  />
                </label>
              </div>
              <div>
                <input
                  type="submit"
                  value="Apply"
                  style={{ display: `block`, marginTop: `1em`, width: `100%` }}
                />
              </div>
            </fieldset>
          </form>
          <h3>Create detailed pages for each entry:</h3>
          <P>
            Place this snippet inside gatsby-node.js file (in the root of the
            project)
          </P>
          <CodeDisplay
            code={`exports.createPages = async ({ actions, graphql }) => {
  // [...] your already existing code
${addIndent(gatsbyNode, `  `)}
}`}
          />
          <h3>Create detailed page template:</h3>
          <P>Place this snippet inside src/templates/blog-post.js file</P>
          <CodeDisplay code={template} />
          <h3>Create listing page:</h3>
          <P>Place this snippet inside src/pages/{listingFile}.js file</P>
          <CodeDisplay code={listing} />
        </React.Fragment>
      )
    },
  },
]
