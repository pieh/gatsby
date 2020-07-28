import React from "react"

import { getModule, graphql, useStaticQuery } from "gatsby"

export default function Feedback() {
  const data = useStaticQuery(graphql`
    {
      site {
        siteMetadata {
          title
        }
      }
      queryModule(moduleFileName: "module-with-static-query.tsx")
    }
  `)
  const Component = getModule(data.queryModule)
  return (
    <>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <Component />
    </>
  )
}
