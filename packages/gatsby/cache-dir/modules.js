const modules = new Map()

export function addModule(moduleId, module) {
  modules.set(moduleId, module)
}

export function getModule(moduleId) {
  return modules.get(moduleId)
}
