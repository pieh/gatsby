/* @flow */
const webpack = require(`webpack`)
const webpackConfig = require(`../utils/webpack.config`)

const { reportWebpackWarnings } = require(`../utils/webpack-error-utils`)
const { store } = require(`../redux`)
const fs = require(`fs-extra`)

module.exports = async (program, { parentSpan }) => {
  const { directory } = program

  const compilerConfig = await webpackConfig(
    program,
    directory,
    `build-javascript`,
    null,
    { parentSpan }
  )

  return new Promise((resolve, reject) => {
    webpack(compilerConfig).run((err, stats) => {
      if (err) {
        reject(err)
        return
      }

      reportWebpackWarnings(stats)

      if (stats.hasErrors()) {
        reject(stats.compilation.errors)
        return
      }

      if (process.env.WEBPACK_PROFILING) {
        fs.outputJSONSync(`public/stats.json`, stats.toJson())
      }

      const state = store.getState()

      const filesWithStaticQueries = {}

      const getEntrypoints = (
        mod,
        entrypoints = new Map(),
        depth = 0,
        visitedModules = new Set()
      ) => {
        if (mod.constructor.name === `ConcatenatedModule`) {
          mod.modules.forEach(m2 => {
            getEntrypoints(m2, entrypoints, depth + 1, visitedModules)
          })
          return entrypoints
        }

        if (state.components.has(mod.resource)) {
          entrypoints.set(mod.resource, {
            type: `page-template`,
            resource: mod.resource,
            pages: state.components.get(mod.resource).pages,
          })
          return entrypoints
        }

        if (visitedModules.has(mod.resource)) {
          return entrypoints
        }
        visitedModules.add(mod.resource)
        if (depth > 30) {
          debugger
        }

        if (mod && mod.reasons) {
          mod.reasons.forEach(reason => {
            if (reason.dependency.type === `single entry`) {
              entrypoints.set(reason.dependency.request, {
                type: `entry`,
                entryName: reason.dependency.loc.name,
                resource: reason.dependency.request,
              })
            } else if (
              reason.dependency.type !== `harmony side effect evaluation` &&
              reason.dependency.type !== `harmony export imported specifier`
            ) {
              getEntrypoints(
                reason.module,
                entrypoints,
                depth + 1,
                visitedModules
              )
            }
          })
        } else {
          // debugger
        }

        return entrypoints
      }

      const findModule = (path, modules) => {
        for (let m of modules) {
          if (m.constructor.name === `ConcatenatedModule`) {
            const possibleMod = findModule(path, m.modules)
            if (possibleMod) {
              return possibleMod
            }
          } else if (
            m.constructor.name === `NormalModule` &&
            m.resource === path
          ) {
            return m
          }
        }
        return null
      }

      state.staticQueryComponents.forEach(c => {
        // if (
        //   c.componentPath !==
        //   "/Users/misiek/test/static-query-split/src/layouts/index.js"
        // ) {
        //   return
        // }
        const ta = { ...c }

        const mod = findModule(c.componentPath, stats.compilation.modules)

        if (mod) {
          ta.entrypoints = getEntrypoints(mod)
          console.info(
            `Static query - ${c.componentPath}:\n${Array.from(
              ta.entrypoints.values()
            )
              .map(t => {
                if (t.type === `entry`) {
                  store.dispatch({
                    type: `ADD_STATIC_QUERY_TO_APP`,
                    payload: {
                      hash: c.hash,
                      id: c.id,
                    },
                  })
                  return ` - [app] from gatsby-browser / gatsby-plugin-layout etc (need in app-data)`
                } else if (t.type === `page-template`) {
                  store.dispatch({
                    type: `ADD_STATIC_QUERY_TO_PAGES`,
                    payload: {
                      componentPath: t.resource,
                      // pages: t.pages,
                      hash: c.hash,
                      id: c.id,
                    },
                  })
                  // debugger
                  return ` - [page template] ${t.resource} (${Array.from(
                    t.pages.values()
                  )
                    .map(p => `"${p}"`)
                    .join(`, `)})`
                }
                return null
              })
              .filter(Boolean)
              .join(`\n`)}`
          )
        }

        filesWithStaticQueries[c.componentPath] = ta
      })

      // debugger

      resolve(stats)
    })
  })
}
