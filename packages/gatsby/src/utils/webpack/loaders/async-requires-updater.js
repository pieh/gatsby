module.exports = function AsyncRequiresUpdater(source) {
  if (this.justClientComponents) {
    this._module.buildInfo._isReplaced = true
    return this.justClientComponents
  }

  return source
}
