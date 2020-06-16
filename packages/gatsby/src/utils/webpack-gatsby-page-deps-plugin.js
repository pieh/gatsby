import VirtualModulesPlugin from "webpack-virtual-modules"
import { store } from "../redux"
import * as path from "path"
import { slash } from "gatsby-core-utils"

function generateExportCode({ type, source, importName }) {
  if (type === `default`) {
    return `export { default } from "${slash(source)}"`
  }

  if (type === `named`) {
    return `export { ${importName} as default } from "${slash(source)}"`
  }

  if (type === `namespace`) {
    return `export * from "${slash(source)}"`
  }

  throw new Error(`GatsbyPageDepsPlugin: Unsupported export type: \${type}`)
}

export class GatsbyPageDepsPlugin {
  pending = {}

  apply(compiler) {
    // const virtualModules =
    // console.log("apply", this.pending)
    this.virtualModules = new VirtualModulesPlugin(this.pending)

    // this.pending = {}
    this.virtualModules.apply(compiler)

    // compiler.hooks.compilation.tap(`GatsbyPageDepsPlugin`, function (
    //   compilation
    // ) {
    //   store.getState().modules.forEach(({ moduleID, ...rest }) => {
    //     this.virtualModules.writeModule(
    //       `node_modules/GATSBY_MAGIC_${moduleID}.js`,
    //       generateExportCode(rest)
    //     )
    //   })
    // })
  }

  writeModule(filePath, fileContents) {
    if (this.pending[filePath] === fileContents) {
      // we already have this, no need to cause invalidation
      return
    }

    this.pending[filePath] = fileContents
    // console.log("write", filePath, fileContents)
    if (this.virtualModules) {
      this.virtualModules.writeModule(filePath, fileContents)
    }
  }
}

export const gatsbyPageDepsPluginInstance = new GatsbyPageDepsPlugin()
