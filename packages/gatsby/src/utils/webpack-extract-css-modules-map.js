const Module = require(`module`)

module.exports = content => {
  try {
    const filename = ``
    var m = new Module(filename, module.parent)
    m._compile(content, filename)
    return `module.exports = ${JSON.stringify(m.exports.locals)}`
  } catch (e) {
    return content
  }
}
