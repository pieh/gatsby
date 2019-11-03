const declare = require(`@babel/helper-plugin-utils`).declare

module.exports = class Plugin {
  constructor() {
    const imports = []
    const identifiers = []
    const modules = []
    this.state = { imports: imports, identifiers: identifiers, modules }
    this.plugin = declare(api => {
      api.assertVersion(7)

      return {
        visitor: {
          ImportDeclaration(path) {
            path.traverse({
              Identifier(path) {
                // only take local bindings
                if (path.key === `local`) {
                  identifiers.push(path.node.name)
                }
              },
            })

            const importPath = path.node.source.value

            path.traverse({
              ImportSpecifier(path2) {
                const exportName = path2.node.imported.name
                const localName = path2.node.local.name
                console.log("ImportSpecifier", importPath, exportName)
                modules.push({ importPath, exportName, localName })
                // debugger
              },
              ImportDefaultSpecifier(path2) {
                console.log("ImportDefaultSpecifier", importPath)
                const localName = path2.node.local.name
                modules.push({ importPath, exportName: `default`, localName })
                // debugger
              },
            })

            // if (!modules.includes(importPath)) {
            //   modules.push(importPath)
            // }

            //            const name = path.get("declaration.declarations.0").node.id.name;

            const importString = path.hub.file.code.slice(
              path.node.start,
              path.node.end
            )
            imports.push(importString)
            path.remove()
          },
        },
      }
    })
  }
}
