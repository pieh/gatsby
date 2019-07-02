import { getOptions } from "loader-utils"

/**
 * Pass-through loader that just output to console file paths handled by webpack rule
 */
export default function(source) {
  var entry = findEntry(this._module)

  const options = getOptions(this)
  console.log(`[${options.tag}] ${this._module.resource}`)

  return source
}
