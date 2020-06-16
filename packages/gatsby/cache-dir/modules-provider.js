import emitter from "./emitter"

let modules = {}

emitter.on(`module-fetched`, event => {
  console.log(`cc`, event)
  modules[event.moduleId] = event.module
})

export function getModule(id) {
  return modules[id]
}

// // for ssr only (should be tree shaken in browser)
if (process.env.GATSBY_BUILD_STAGE === `build-html`) {
  modules = require(`$virtual/sync-modules`).modules
}
