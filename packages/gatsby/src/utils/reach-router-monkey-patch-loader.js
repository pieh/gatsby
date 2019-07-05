export default function(source) {
  if (/reach\/router\/es\/index/.test(this._module.resource)) {
    // all it does is adding BaseContext to list of exports
    return source.replace(
      /export\s+{\s+([^}]+)\s+}/m,
      `export { $1, BaseContext }`
    )
  }
  return source
}
