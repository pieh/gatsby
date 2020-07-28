import React from "react"
import { graphql, getModule } from "gatsby"

export default function PageQueryModulesWithNestedStaticQuery({ data }) {
  const Component = getModule(data.queryModule)
  return <Component />
}

export const pageQuery = graphql`
  {
    queryModule(
      moduleFileName: "module-that-imports-module-with-static-query.tsx"
    )
  }
`
