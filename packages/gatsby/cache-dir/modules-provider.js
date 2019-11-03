import React from "react"
import emitter from "./emitter"

let modules = {}

emitter.on(`module-fetched`, event => {
  console.log("cc", event)
  modules[event.moduleId] = event.module
})

// const Placeholder = () => <div>placeholder</div>

export function getModule(id) {
  // if (!modules[id]) {
  //   return Placeholder
  // }
  return modules[id]
}

// for ssr only (should be tree shaken in browser)
export function setModules(_modules) {
  modules = _modules
}
