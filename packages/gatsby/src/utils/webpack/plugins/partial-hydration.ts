import * as path from "path"
import fs from "fs-extra"
import Template from "webpack/lib/Template"
import ImportDependency from "webpack/lib/dependencies/ImportDependency"
import { createNormalizedModuleKey } from "../utils/create-normalized-module-key"
import webpack, { Module, NormalModule, Dependency, javascript } from "webpack"
import type Reporter from "gatsby-cli/lib/reporter"

import { getAbsolutePathForVirtualModule } from "../../gatsby-webpack-virtual-modules"
import { slash } from "gatsby-core-utils/path"

interface IModuleExport {
  id: string
  chunks: Array<string>
  name: string
}

interface IDirective {
  directive?: string
}

/**
 * @see https://github.com/facebook/react/blob/3f70e68cea8d2ed0f53d35420105ae20e22ce428/packages/react-server-dom-webpack/src/ReactFlightWebpackPlugin.js#L27-L35
 */
class ClientReferenceDependency extends ImportDependency {
  constructor(request) {
    super(request)
  }

  get type(): string {
    return `client-reference`
  }
}

/**
 * inspiration and code mostly comes from https://github.com/facebook/react/blob/3f70e68cea8d2ed0f53d35420105ae20e22ce428/packages/react-server-dom-webpack/src/ReactFlightWebpackPlugin.js
 */
export class PartialHydrationPlugin {
  name = `PartialHydrationPlugin`

  _manifestPath: string // Absolute path to where the manifest file should be written
  _reporter: typeof Reporter

  _references: Array<ClientReferenceDependency> = []
  _clientModules = new Set<webpack.NormalModule>()
  _previousManifest = {}

  constructor(manifestPath: string, reporter: typeof Reporter) {
    this._manifestPath = manifestPath
    this._reporter = reporter
  }

  _generateManifest(
    _chunkGroups: webpack.Compilation["chunkGroups"],
    moduleGraph: webpack.Compilation["moduleGraph"],
    chunkGraph: webpack.Compilation["chunkGraph"],
    rootContext: string
  ): Record<string, Record<string, IModuleExport>> {
    const json: Record<string, Record<string, IModuleExport>> = {}
    // @see https://github.com/facebook/react/blob/3f70e68cea8d2ed0f53d35420105ae20e22ce428/packages/react-server-dom-webpack/src/ReactFlightWebpackPlugin.js#L220-L252
    const recordModule = (
      id: string,
      module: Module | NormalModule,
      exports: Array<{ originalExport: string; resolvedExport: string }>,
      chunkIds: Array<string>
    ): void => {
      if (
        // @ts-ignore - types are incorrect
        !module.resource
      ) {
        return
      }

      const normalModule: NormalModule = module as NormalModule

      const moduleExports: Record<string, IModuleExport> = {}
      exports.forEach(({ originalExport, resolvedExport }) => {
        moduleExports[originalExport] = {
          id: id,
          chunks: chunkIds,
          name: resolvedExport,
        }
      })

      const normalizedModuleKey = createNormalizedModuleKey(
        normalModule.resource,
        rootContext
      )

      if (normalizedModuleKey !== undefined) {
        json[normalizedModuleKey] = moduleExports
      }
    }

    const toRecord: Map<
      webpack.Module,
      Map<
        webpack.Module,
        Array<{
          originalExport: string
          resolvedExport: string
        }>
      >
    > = new Map()

    for (const clientModule of this._clientModules) {
      for (const connection of moduleGraph.getIncomingConnections(
        clientModule
      )) {
        if (connection.dependency) {
          if (toRecord.has(connection.module)) {
            continue
          }

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const childMap = new Map()
          toRecord.set(connection.module, childMap)

          for (const exportInfo of moduleGraph.getExportsInfo(connection.module)
            .exports) {
            if (exportInfo.isReexport()) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const targetInfo = exportInfo.getTarget(moduleGraph)!
              if (!childMap.has(targetInfo.module)) {
                childMap.set(targetInfo.module, [])
              }

              childMap.get(targetInfo.module)?.push({
                originalExport: exportInfo.name,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                resolvedExport: targetInfo.export![0],
              })
            } else {
              if (!childMap.has(connection.module)) {
                childMap.set(connection.module, [])
              }

              childMap.get(connection.module)?.push({
                originalExport: exportInfo.name,
                resolvedExport: exportInfo.name,
              })
            }
          }
        }
      }
    }

    for (const [originalModule, resolvedMap] of toRecord) {
      for (const [resolvedModule, exports] of resolvedMap) {
        const chunkIds: Set<string> = new Set()
        for (const chunk of chunkGraph.getModuleChunksIterable(
          resolvedModule
        )) {
          for (const group of chunk.groupsIterable) {
            for (const chunkInGroup of group.chunks) {
              if (chunkInGroup.id) {
                chunkIds.add(chunkInGroup.id as string)
              }
            }
          }
        }

        const moduleId = chunkGraph.getModuleId(resolvedModule) as string
        recordModule(moduleId, originalModule, exports, Array.from(chunkIds))
      }
    }

    toRecord.clear()

    return json
  }

  apply(compiler: webpack.Compiler): void {
    // Restore manifest from the previous compilation, otherwise it will be wiped since files aren't visited on cached builds
    compiler.hooks.beforeCompile.tap(this.name, () => {
      try {
        const previousManifest = fs.existsSync(this._manifestPath)

        if (!previousManifest) {
          return
        }

        this._previousManifest = JSON.parse(
          fs.readFileSync(this._manifestPath, `utf-8`)
        )
      } catch (error) {
        this._reporter.panic({
          id: `80001`,
          context: {},
          error,
        })
      }
    })

    compiler.hooks.thisCompilation.tap(
      this.name,
      (compilation, { normalModuleFactory }) => {
        // tell webpack that this is a regular javascript module
        const handler = (parser: javascript.JavascriptParser): void => {
          parser.hooks.program.tap(this.name, ast => {
            const hasClientExportDirective = ast.body.find(
              statement =>
                statement.type === `ExpressionStatement` &&
                (statement as IDirective).directive === `client export`
            )

            const module = parser.state.module

            if (hasClientExportDirective) {
              this._clientModules.add(module)
            }
          })
        }

        let justClientComponents: string | null = null
        NormalModule.getCompilationHooks(compilation).loader.tap(
          this.name,
          loaderContext => {
            // @ts-ignore
            loaderContext.justClientComponents = justClientComponents
          }
        )

        compilation.hooks.finishModules.tapAsync(
          this.name,
          (modules, callback) => {
            function matcher(m) {
              return m.resource && m.resource.includes(`async-requires.js`)
            }

            const module = Array.from(modules).find(matcher)

            if (!module) {
              throw new Error("something went wrong")
            }

            // Check if already build the updated version
            // this will happen when using caching
            if (module.buildInfo._isReplaced) {
              return callback()
            }

            let lines = ``
            // some hardcoding
            for (const clientModule of this._clientModules) {
              const relativeComponentPath = path.relative(
                getAbsolutePathForVirtualModule(`$virtual`),
                clientModule.userRequest
              )

              const chunkName = Template.toPath(
                path.relative(
                  compilation.options.context!,
                  clientModule.userRequest
                )
              )

              const line = `"${chunkName}": () => import("${slash(
                `./${relativeComponentPath}`
              )}" /* webpackChunkName: "${chunkName}" */),`

              lines += line
            }

            justClientComponents = `

            exports.clientComponents = {
${lines}
            }
            
exports.head = {
  "component---src-pages-404-js": () => import("./../../../src/pages/404.js?export=head" /* webpackChunkName: "component---src-pages-404-jshead" */),
  "component---src-pages-index-js": () => import("./../../../src/pages/index.js?export=head" /* webpackChunkName: "component---src-pages-index-jshead" */),
  "component---src-pages-page-2-js": () => import("./../../../src/pages/page-2.js?export=head" /* webpackChunkName: "component---src-pages-page-2-jshead" */),
  "component---src-pages-using-partial-hydration-js": () => import("./../../../src/pages/using-partial-hydration.js?export=head" /* webpackChunkName: "component---src-pages-using-partial-hydration-jshead" */),
  "component---src-pages-using-typescript-tsx": () => import("./../../../src/pages/using-typescript.tsx?export=head" /* webpackChunkName: "component---src-pages-using-typescript-tsxhead" */)
}
            
            `
            compilation.rebuildModule(module, err => {
              justClientComponents = null
              callback(err)
            })
          }
        )

        normalModuleFactory.hooks.parser
          .for(`javascript/auto`)
          .tap(this.name, handler)
        normalModuleFactory.hooks.parser
          .for(`javascript/esm`)
          .tap(this.name, handler)
        normalModuleFactory.hooks.parser
          .for(`javascript/dynamic`)
          .tap(this.name, handler)

        compilation.hooks.processAssets.tap(
          {
            name: this.name,
            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
          },
          () => {
            const manifest = this._generateManifest(
              compilation.chunkGroups,
              compilation.moduleGraph,
              compilation.chunkGraph,
              compilation.options.context as string
            )

            /**
             * `emitAsset` is unclear about what the path should be relative to and absolute paths don't work. This works so we'll go with that.
             * @see {@link https://webpack.js.org/api/compilation-object/#emitasset}
             */
            const emitManifestPath = `..${this._manifestPath.replace(
              compiler.context,
              ``
            )}`

            compilation.emitAsset(
              emitManifestPath,
              new webpack.sources.RawSource(
                JSON.stringify(
                  { ...this._previousManifest, ...manifest },
                  null,
                  2
                ),
                false
              )
            )
          }
        )
      }
    )
  }
}
