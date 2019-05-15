import React from "react"

function interopDefault(mod) {
  return (mod && mod.default) || mod
}

export default ({ load, ...props }) => {
  const Child = interopDefault(load())
  return (
    <section>
      <Child {...props} />
    </section>
  )
}
