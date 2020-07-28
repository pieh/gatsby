import React from "react"
import { useStaticQuery, graphql, getModule } from "gatsby"

export default function ModuleComponentWithStaticQuery() {
  const { queryModule, b } = useStaticQuery(graphql`
    {
      queryModule(moduleFileName: "module-a.js")
      b: queryModule(moduleFileName: "module-b.js")
    }
  `)
  const Component = getModule(queryModule)
  const ComponentB = getModule(b)
  return (
    <div>
      component A
      <Component />
      component B
      <ComponentB />
    </div>
  )
}
