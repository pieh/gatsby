import { graphql } from "gatsby"
import React from "react"
import styled from "react-emotion"

import { rhythm, scale, options } from "../utils/typography"
import { colors } from "../utils/presets"

const Deprecation = styled(`div`)`
  color: ${colors.code.comment};
  :before {
    content: "DEPRECATED ";
    font-size: 0.7em;
    font-weight: 700;
  }
`

const exampleMapper = (example, i) => (
  <div className="gatsby-highlight" key={`example ${i}`}>
    <pre className="language-javascript">
      <code
        className="language-javascript"
        dangerouslySetInnerHTML={{
          __html: example.highlighted,
        }}
      />
    </pre>
  </div>
)

const typeToString = type => {
  if (type.type === `NameExpression`) {
    return type.name
  } else if (type.type === `UnionType`) {
    return type.elements.map(typeToString).join(`|`)
  } else if (type.type === `TypeApplication`) {
    // special case for Array
    if (type.expression.name === `Array`) {
      return `${typeToString(type.applications[0])}[]`
    } else {
      return `${typeToString(type.expression)}<${type.applications
        .map(typeToString)
        .join(`,`)}>`
    }
  }
  return null
}

const FunctionSignatture = ({ typeDef }) => {
  const params = typeDef.params.map((param, index) => (
    <React.Fragment key={param.name}>
      {index > 0 && `, `}
      {param.name}
      {param.type && (
        <React.Fragment>
          : <span>{typeToString(param.type)}</span>
        </React.Fragment>
      )}
    </React.Fragment>
  ))

  return (
    <code>
      {`(`}
      {params}
      {`)`} => {typeToString(typeDef.returns[0].type)}
    </code>
  )
}

const Param = (param, depth = 0) => {
  // The "plugin" parameter is used internally but not
  // something a user should use.
  if (
    param.name === `plugin` ||
    param.name === `traceId` ||
    param.name === `actionOptions`
  ) {
    return null
  }

  let example = null
  let type = null
  let signature = null
  if (param.type) {
    if (
      param.type.typeDef &&
      param.type.typeDef.params &&
      param.type.typeDef.params.length > 0
    ) {
      // const formattedParams = ()
      signature = <FunctionSignatture typeDef={param.type.typeDef} />

      type = `Function`
    } else if (param.name !== `$0`) {
      type = typeToString(param.type)
    }

    if (
      param.type.typeDef &&
      param.type.typeDef.examples &&
      param.type.typeDef.examples.length > 0
    ) {
      example = (
        <React.Fragment>
          <h5>Examples</h5>
          {param.type.typeDef.examples.map(exampleMapper)}
        </React.Fragment>
      )
    }
  }

  return (
    <div
      key={`param ${JSON.stringify(param)}`}
      css={{
        marginLeft: `${depth * 1.05}rem`,
        ...(depth > 0 && scale((depth === 1 ? -1 : -1.5) / 5)),
        lineHeight: options.baseLineHeight,
      }}
    >
      <h5
        css={{
          margin: 0,
          ...(depth > 0 && scale((depth === 1 ? 0 : -0.5) / 5)),
        }}
      >
        {param.name === `$0` ? `destructured object` : param.name}
        {` `}
        {param.type &&
          param.name !== `$0` && (
            <span css={{ color: `#73725f` }}>
              {`{`}
              {type}
              {`}`}
            </span>
          )}
        {param.default && (
          <span css={{ color: `#73725f` }}>
            [default=
            {param.default}]
          </span>
        )}
      </h5>
      {param.description && (
        <div
          css={{ marginBottom: rhythm(-1 / 4) }}
          dangerouslySetInnerHTML={{
            __html: param.description.childMarkdownRemark.html,
          }}
        />
      )}
      {signature}
      {example}
      {param.properties && (
        <div css={{ marginBottom: rhythm(1), marginTop: rhythm(1 / 2) }}>
          {param.properties.map(param => Param(param, depth + 1))}
        </div>
      )}
    </div>
  )
}

export default ({ functions, showTypes }) => (
  <div>
    {functions.map((node, i) => {
      if (node.kind === `typedef`) {
        return null
      }
      return (
        <div
          id={node.name}
          key={`reference list ${node.name}`}
          css={{ marginBottom: rhythm(1) }}
        >
          {i !== 0 && <hr />}
          <h3>
            <a href={`#${node.name}`}>
              <code>{node.name}</code>
            </a>
            {showTypes && node.type && `{${node.type.name}}`}
          </h3>
          {node.description &&
            node.description.childMarkdownRemark && (
              <div
                dangerouslySetInnerHTML={{
                  __html: node.description.childMarkdownRemark.html,
                }}
              />
            )}
          {node.deprecated &&
            node.deprecated.childMarkdownRemark && (
              <Deprecation
                dangerouslySetInnerHTML={{
                  __html: node.deprecated.childMarkdownRemark.html,
                }}
              />
            )}
          {showTypes &&
            node.params &&
            node.params.length > 0 &&
            node.returns &&
            node.returns.length > 0 && (
              // <React.Fragment>
              //   {`{`}
              <FunctionSignatture typeDef={node} />
              //   {`}`}
              // </React.Fragment>
            )}
          {node.properties &&
            node.properties.length > 0 && (
              <div>
                <h4>Properties</h4>
                <ul>
                  {node.properties.map(property => (
                    <li key={property.name}>{Param(property, 0)}</li>
                  ))}
                </ul>
              </div>
            )}
          {(node.params && node.params.length) > 0 && (
            <div>
              <h4>Parameters</h4>
              {node.params.map(param => Param(param, 0))}
            </div>
          )}
          {node.returns &&
            node.returns.length > 0 && (
              <div>
                <h4>Return value</h4>
                {node.returns.map(ret => (
                  <div
                    key={`ret ${JSON.stringify(ret)}`}
                    css={{
                      marginLeft: `1.05rem`,
                      ...scale(-1 / 5),
                      lineHeight: options.baseLineHeight,
                    }}
                  >
                    <h5 css={{ margin: 0 }}>
                      <span css={{ color: `#73725f` }}>
                        {`{${typeToString(ret.type)}}`}
                      </span>
                    </h5>
                    {ret.description && (
                      <div
                        css={{ marginBottom: rhythm(-1 / 4) }}
                        dangerouslySetInnerHTML={{
                          __html: ret.description.childMarkdownRemark.html,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

          {node.examples &&
            node.examples.length > 0 && (
              <div>
                <h4 css={{ marginTop: rhythm(1) }}>Example</h4>
                {` `}
                {node.examples.map(exampleMapper)}
              </div>
            )}
        </div>
      )
    })}
  </div>
)

export const pageQuery = graphql`
  fragment FunctionListX on DocumentationJs {
    name
    kind
    type {
      name
    }
    description {
      childMarkdownRemark {
        html
      }
    }
    returns {
      type {
        name
        type
        elements {
          name
          type
        }
        expression {
          type
          name
        }
        applications {
          type
          name
        }
      }
      description {
        childMarkdownRemark {
          html
        }
      }
    }
    examples {
      highlighted
    }
    properties {
      name
      description {
        childMarkdownRemark {
          html
        }
      }
      type {
        type
        name
        typeDef {
          examples {
            highlighted
          }
          params {
            name
            type {
              type
              name
            }
          }
          returns {
            type {
              type
              name
              expression {
                type
                name
              }
              applications {
                type
                name
              }
            }
          }
        }
      }
    }
    params {
      name
      type {
        type
        name
        elements {
          type
          name
        }
      }
      description {
        childMarkdownRemark {
          html
        }
      }
      properties {
        name
        type {
          type
          name
        }
        default
        description {
          childMarkdownRemark {
            html
          }
        }
        properties {
          name
          type {
            type
            name
          }
          description {
            childMarkdownRemark {
              html
            }
          }
        }
      }
    }
  }
`
