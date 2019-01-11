import React from "react"
import styled from "react-emotion"
import { graphql } from "gatsby"

// import TypeComponent from "./type"
import { SubHeader } from "./utils"
import { options } from "../../utils/typography"

const Wrapper = styled(`span`)`
  font-family: ${options.headerFontFamily.join(`,`)};
  font-weight: bold;
  :before,
  :after {
    color: #969584;
  }

  :before {
    content: "{ ";
  }
  :after {
    content: " }";
  }
`
const isOptional = type => type && type.type === `OptionalType`

const TypeComponent = ({ children }) => (
  <span className="token builtin">{children}</span>
)

const Punctuation = ({ children }) => (
  <span className="token punctuation">{children}</span>
)

const Operator = ({ children }) => (
  <span className="token operator">{children}</span>
)

const ReactJoin = (arrayOfElements, joiner) =>
  arrayOfElements.reduce((acc, current, index) => {
    if (index > 0) {
      acc.push(joiner)
    }
    acc.push(current)

    return acc
  }, [])

const TypeExpression = ({ type }) => {
  if (type.type === `NameExpression`) {
    return <TypeComponent>{type.name}</TypeComponent>
  } else if (type.type === `UnionType`) {
    return (
      <React.Fragment>
        {ReactJoin(
          type.elements.map(element => <TypeExpression type={element} />),
          <Operator> | </Operator>
        )}
      </React.Fragment>
    )
  } else if (type.type === `TypeApplication` && type.expression) {
    if (type.expression.name === `Array`) {
      return (
        <React.Fragment>
          <TypeExpression type={type.applications[0]} />
          <Operator>[]</Operator>
        </React.Fragment>
      )

      // `${typeToString(type.applications[0])}[]`
    } else {
      return (
        <React.Fragment>
          <TypeExpression type={type.expression} />
          {`<`}
          <TypeExpression type={type.applications[0]} />
          {`>`}
        </React.Fragment>
      )
    }
  } else if (isOptional(type) && type.expression) {
    return <TypeExpression type={type.expression} />
  }
  return null
}

const FunctionSignature = ({ definition, block, ignoreParams }) => {
  const params = definition.params
    ? definition.params
        .filter(param => !ignoreParams.includes(param.name))
        .map((param, index) => (
          <React.Fragment key={param.name}>
            {index > 0 && <Punctuation>, </Punctuation>}
            {param.name}
            {param.type && (
              <React.Fragment>
                <Punctuation>{isOptional(param.type) && `?`}:</Punctuation>
                {` `}
                <TypeExpression type={param.type} />
              </React.Fragment>
            )}
          </React.Fragment>
        ))
    : null

  return (
    <Wrapper block={block}>
      <Punctuation>{`(`}</Punctuation>
      {params}
      <Punctuation>{`)`}</Punctuation> <Operator>=&gt;</Operator>
      {` `}
      {definition.returns && definition.returns.length ? (
        <TypeExpression type={definition.returns[0].type} />
      ) : (
        <TypeComponent>null</TypeComponent>
      )}
    </Wrapper>
  )
}

const isFunctionDef = (definition, recursive = true) =>
  (definition.params && definition.params.length > 0) ||
  (definition.returns && definition.returns.length > 0) ||
  (recursive &&
    definition.type &&
    definition.type.typeDef &&
    isFunctionDef(definition.type.typeDef, false))

const SignatureElement = ({
  definition,
  ignoreParams,
  fallbackToName = false,
  block = false,
}) => {
  if (isFunctionDef(definition, false)) {
    return (
      <FunctionSignature
        definition={definition}
        block={block}
        ignoreParams={ignoreParams}
      />
    )
  }

  if (definition.type && definition.type.typeDef) {
    return (
      <SignatureElement
        definition={definition.type.typeDef}
        fallbackToName={true}
        ignoreParams={ignoreParams}
        block={block}
      />
    )
  }

  if (definition.type) {
    return (
      <Wrapper block={block}>
        <TypeExpression type={definition.type} />
      </Wrapper>
    )
  }

  if (fallbackToName && definition.name) {
    return (
      <Wrapper block={block}>
        <TypeComponent>{definition.name}</TypeComponent>
      </Wrapper>
    )
  }

  return null
}

const SignatureBlock = ({ definition, level = 0 }) => (
  <React.Fragment>
    <SubHeader level={level}>Signature</SubHeader>
    <SignatureElement definition={definition} />
  </React.Fragment>
)

export {
  isFunctionDef,
  SignatureElement,
  SignatureBlock,
  TypeComponent,
  Wrapper as SignatureWrapper,
  isOptional as isOptionalType,
}

export const fragment = graphql`
  fragment DocumentationTypeFragment on DocumentationJs {
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
  }
`
