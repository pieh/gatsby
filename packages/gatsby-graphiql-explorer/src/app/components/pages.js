import React, { useEffect, useState } from "react"
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer"

// thanks Gabe - https://dev.to/gabe_ragland/debouncing-with-react-hooks-jci
function useDebounce(value, delay) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(
    () => {
      // Set debouncedValue to value (passed in) after the specified delay
      const handler = setTimeout(() => {
        setDebouncedValue(value)
      }, delay)

      // Return a cleanup function that will be called every time ...
      // ... useEffect is re-called. useEffect will only be re-called ...
      // ... if value changes (see the inputs array below).
      // This is how we prevent debouncedValue from changing if value is ...
      // ... changed within the delay period. Timeout gets cleared and restarted.
      // To put it in context, if the user is typing within our app's ...
      // ... search box, we don't want the debouncedValue to update until ...
      // ... they've stopped typing for more than 500ms.
      return () => {
        clearTimeout(handler)
      }
    },
    // Only re-call effect if value changes
    // You could also add the "delay" var to inputs array if you ...
    // ... need to be able to change that dynamically.
    [value]
  )

  return debouncedValue
}

function fetchTemplates(search, controller) {
  return fetch(
    `/___graphql/pages/${search}`,
    controller ? { signal: controller.signal } : undefined
  )
    .catch(err => console.error(`Error fetching pages: \n${err}`))
    .then(response => response.json())
}

function fetchPageDetails(page, controller) {
  return fetch(
    `/___graphql/page-details?page=${encodeURIComponent(page)}`,
    controller ? { signal: controller.signal } : undefined
  )
    .catch(err => console.error(`Error fetching page details: \n${err}`))
    .then(response => response.json())
    .then(data => {
      if (!data) {
        return data
      }

      // strip indendation on original query for display and editing (we will restore those settings later
      // if we will export it back to a file)

      let leadingWhitespace = ``
      let commonIndentation = ``
      let trailingWhitespace = ``

      let commonIndentationLength = Infinity
      let whiteSpaceBuffer = ``

      let hadContent = false
      let lines = data.query.split(`\n`)
      let modifiedQueryTextLines = ``
      for (let line of lines) {
        if (line.trim() === ``) {
          whiteSpaceBuffer += `${line}\n`
        } else {
          if (!hadContent) {
            leadingWhitespace = whiteSpaceBuffer
            hadContent = true
          } else {
            // trailingWhitespace = whiteSpaceBuffer
            if (whiteSpaceBuffer) {
              modifiedQueryTextLines += whiteSpaceBuffer
            }
          }
          whiteSpaceBuffer = ``

          modifiedQueryTextLines += `${line}\n`

          const matches = line.match(/^[^\S\n]*(?=\S)/gm)
          if (matches) {
            for (const match of matches) {
              if (match.length < commonIndentationLength) {
                commonIndentationLength = match.length
                commonIndentation = match
              }
            }
          }
        }
      }
      trailingWhitespace = whiteSpaceBuffer

      return {
        ...data,
        origQuery: data.query,
        query: modifiedQueryTextLines.replace(
          new RegExp("^.{" + commonIndentationLength + "}", `gm`),
          ``
        ),
        leadingWhitespace,
        commonIndentation,
        trailingWhitespace,
      }
    })
}

export function PagesExplorer({ setQueryAndVariables, editorQuery }) {
  const [search, setSearch] = useState(``)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [templates, setPageTemplates] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const debouncedSearch = useDebounce(search, 500)
  // const [pagePathAndComponent, setPagePathAndComponent] = useState(null)
  const [pagePathAndComponent, setPagePathAndComponent] = useState(
    null
    // {
    // pagePath: `/my-second-post/`,
    // componentPath: `src/templates/blog-post.js`,
    // }
  )
  const [page, setPage] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchTemplates(search, controller).then(setPageTemplates)

    return () => {
      controller.abort()
    }
  }, [debouncedSearch, setPageTemplates])

  useEffect(() => {
    if (pagePathAndComponent) {
      const controller = new AbortController()

      fetchPageDetails(pagePathAndComponent.pagePath, controller).then(page => {
        setPage(page)
        if (!page) {
          setPagePathAndComponent(null)
        }
      })

      return () => {
        controller.abort()
      }
    }
  }, [pagePathAndComponent, setPage, setPagePathAndComponent, refreshCounter])

  const showPageDetails = page && pagePathAndComponent
  const size = 800 // 440
  return (
    <div
      className="docExplorerWrap"
      style={{ width: size, minWidth: size, zIndex: 7 }}
    >
      <div className="doc-explorer-title-bar">
        {showPageDetails ? (
          <button
            className="doc-explorer-back"
            aria-label="Go back to Pages Explorer"
            onClick={() => {
              setPagePathAndComponent(null)
              setPage(null)
            }}
          >
            Pages Explorer
          </button>
        ) : null}
        <div className="doc-explorer-title">
          {showPageDetails ? pagePathAndComponent.pagePath : `Pages Explorer`}
        </div>
        <div className="doc-explorer-rhs">
          <div className="docExplorerHide">✕</div>
        </div>
      </div>
      <div className="doc-explorer-contents">
        {showPageDetails ? (
          <>
            <code>{pagePathAndComponent.componentPath}</code>
            <p>
              <button
                onClick={() => {
                  setQueryAndVariables({
                    query: page.query,
                    variables: JSON.stringify(page.context, null, 2),
                  })
                }}
              >
                Import to editor
              </button>
            </p>
            <p>
              <button
                onClick={() => {
                  // stitch whitespaces back
                  const query =
                    page.leadingWhitespace +
                    editorQuery
                      .split(`\n`)
                      .map(line =>
                        line ? `${page.commonIndentation}${line}` : ``
                      )
                      .join(`\n`) +
                    page.trailingWhitespace

                  fetch(`/___graphql/query-update`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      componentPath: pagePathAndComponent.componentPath,
                      query,
                    }),
                  }).then(() => {
                    setRefreshCounter(c => c + 1)
                  })
                }}
              >
                Save query to template file
              </button>
            </p>
            <div className="doc-category">
              <div className="doc-category-title">Query</div>
              <div className="doc-category-item">
                {page.query ? (
                  <ReactDiffViewer
                    oldValue={page.query}
                    newValue={editorQuery}
                    splitView={false}
                    hideLineNumbers={true}
                    compareMethod={DiffMethod.LINES}
                    showDiffOnly={false}
                  />
                ) : (
                  <>Template has no query</>
                )}
              </div>
            </div>
            <div className="doc-category">
              <div className="doc-category-title">Page Context</div>
              <div className="doc-category-item">
                {page.context && Object.keys(page.context).length > 0 ? (
                  <pre>{JSON.stringify(page.context, null, 2)}</pre>
                ) : (
                  <>Page has no context</>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <label className="search-box">
              <div className="search-box-icon" aria-hidden="true">
                ⚲
              </div>
              <input
                type="text"
                placeholder="Search Pages..."
                aria-label="Search Pages..."
                defaultValue={search}
                onChange={e => setSearch(e.target.value)}
              />
            </label>
            {templates
              ? templates.map(function ({ componentPath, pages }) {
                  return (
                    <div className="doc-category">
                      <div className="doc-category-title" key={componentPath}>
                        {componentPath}
                      </div>

                      {pages.map(function (pagePath) {
                        return (
                          <div className="doc-category-item" key={pagePath}>
                            <a
                              href="#"
                              className="type-name"
                              onClick={e => {
                                e.stopPropagation()
                                setPagePathAndComponent({
                                  pagePath,
                                  componentPath,
                                })
                              }}
                            >
                              {pagePath}
                            </a>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              : null}
          </>
        )}
        {/* <pre>
          {JSON.stringify(
            { search, templates, page, pagePathAndComponent },
            null,
            2
          )}
        </pre> */}
      </div>
    </div>
  )
}
