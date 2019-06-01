export default [
  {
    name: `Page template`,
    language: `JavaScript`,
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
  },
]
