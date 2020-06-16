import { slash } from "gatsby-core-utils"

import { IRegisterModuleAction } from "../../types"
import { generateComponentChunkName } from "../../../utils/js-chunk-names"

const {
  gatsbyPageDepsPluginInstance,
} = require(`../../../utils/webpack-gatsby-page-deps-plugin`)

export const generateModuleId = ({
  source,
  type = `default`,
  importName,
}): string =>
  `${generateComponentChunkName(source, `module`)}-${type}-${importName || ``}`

type ReturnType = (dispatch: (IRegisterModuleAction) => void) => string

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

export const registerModule = (
  {
    moduleID,
    source,
    importName,
    type = `default`,
  }: {
    moduleID?: string
    source: string
    type: string
    importName?: string
  },
  plugin = ``
): ReturnType => {
  const _moduleID = moduleID || generateModuleId({ source, type, importName })

  console.log(`[register-module] Writing module "${_moduleID}"`)
  gatsbyPageDepsPluginInstance.writeModule(
    `node_modules/$virtual/modules/${_moduleID}.js`,
    generateExportCode({
      type,
      source,
      importName,
    })
  )

  return dispatch => {
    const action = {
      type: `REGISTER_MODULE`,
      plugin,
      payload: {
        moduleID: _moduleID,
        source,
        type,
        importName,
      },
    }
    dispatch(action)
    return _moduleID
  }
}
