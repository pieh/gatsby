import React from "react"
import { graphql } from "gatsby"

import DocBlock from "./doc-block"

import { rhythm, scale, options } from "../../utils/typography"
/*
const Param = (param, depth = 0) => (
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
          <span css={{ color: `#73725f` }}>{`{${param.type.name}}`}</span>
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
    {param.properties && (
      <div css={{ marginBottom: rhythm(1), marginTop: rhythm(1 / 2) }}>
        {param.properties.map(param => Param(param, depth + 1))}
      </div>
    )}
  </div>
)
*/

export default ({
  docs,
  showTopLevelSignatures = false,
  ignoreParams = [],
}) => (
  <React.Fragment>
    {docs.map((definition, i) => (
      <div
        id={definition.name}
        key={`reference list ${definition.name}`}
        css={{ marginBottom: rhythm(1) }}
      >
        {i !== 0 && <hr />}
        <DocBlock
          definition={definition}
          showSignature={showTopLevelSignatures}
          level={0}
          linkableTitle={true}
          ignoreParams={ignoreParams}
        />

        {/* {(node.params && node.params.length) > 0 && (
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
                      {`{${
                        ret.type.type === `UnionType`
                          ? ret.type.elements
                              .map(el => String(el.name))
                              .join(`|`)
                          : ret.type.name
                      }}`}
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
              {node.examples.map((example, i) => (
                <Example example={example} key={`${node.name} example ${i}`} />
              ))}
            </div>
          )} */}
      </div>
    ))}
  </React.Fragment>
)

export const pageQuery = graphql`
  fragment DocumentationDescriptionFragment on DocumentationJs {
    name
    description {
      childMarkdownRemark {
        html
      }
    }
    deprecated {
      childMarkdownRemark {
        html
      }
    }
  }

  fragment DocumentationFragment on DocumentationJs {
    ...DocumentationDescriptionFragment
    ...DocumentationExampleFragment
    ...DocumentationParamsFragment
    ...DocumentationReturnsFragment
  }
`

/*
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
*/
