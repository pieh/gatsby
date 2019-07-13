const preset = require(`../`)
const path = require(`path`)

it(`Specifies proper presets and plugins for test stage`, () => {
  const { presets, plugins } = preset()

  expect(presets).toEqual([
    [
      expect.stringContaining(path.join(`@babel`, `preset-env`)),
      {
        exclude: [`transform-typeof-symbol`],
        corejs: 2,
        loose: true,
        modules: `commonjs`,
        useBuiltIns: `usage`,
        targets: {
          node: `current`,
        },
      },
    ],
    [
      expect.stringContaining(path.join(`@babel`, `preset-react`)),
      {
        development: false,
        pragma: `React.createElement`,
        useBuiltIns: true,
      },
    ],
  ])
  expect(plugins).toEqual([
    [
      expect.stringContaining(
        path.join(`@babel`, `plugin-proposal-class-properties`)
      ),
      { loose: true },
    ],
    expect.stringContaining(`babel-plugin-macros`),
    expect.stringContaining(
      path.join(`@babel`, `plugin-syntax-dynamic-import`)
    ),
    [
      expect.stringContaining(path.join(`@babel`, `plugin-transform-runtime`)),
      {
        absoluteRuntimePath: expect.stringContaining(
          path.join(`@babel`, `runtime`)
        ),
        corejs: false,
        helpers: true,
        regenerator: true,
        useESModules: false,
      },
    ],
    [
      expect.stringContaining(path.join(`@babel`, `plugin-transform-spread`)),
      {
        loose: false,
      },
    ],
    expect.stringContaining(`babel-plugin-dynamic-import-node`),
  ])
})

it(`Specifies proper presets and plugins for build-html stage`, () => {
  const currentGatsbyBuildStage = process.env.GATSBY_BUILD_STAGE
  let presets, plugins
  try {
    process.env.GATSBY_BUILD_STAGE = `build-html`
    const config = preset()
    presets = config.presets
    plugins = config.plugins
  } finally {
    process.env.GATSBY_BUILD_STAGE = currentGatsbyBuildStage
  }

  expect(presets).toEqual([
    [
      expect.stringContaining(path.join(`@babel`, `preset-env`)),
      {
        exclude: [`transform-typeof-symbol`],
        corejs: 2,
        loose: true,
        modules: false,
        useBuiltIns: `usage`,
        targets: {
          node: `current`,
        },
      },
    ],
    [
      expect.stringContaining(path.join(`@babel`, `preset-react`)),
      {
        development: false,
        pragma: `React.createElement`,
        useBuiltIns: true,
      },
    ],
  ])
  expect(plugins).toEqual([
    [
      expect.stringContaining(
        path.join(`@babel`, `plugin-proposal-class-properties`)
      ),
      { loose: true },
    ],
    expect.stringContaining(`babel-plugin-macros`),
    expect.stringContaining(
      path.join(`@babel`, `plugin-syntax-dynamic-import`)
    ),
    [
      expect.stringContaining(path.join(`@babel`, `plugin-transform-runtime`)),
      {
        absoluteRuntimePath: expect.stringContaining(
          path.join(`@babel`, `runtime`)
        ),
        helpers: false,
        regenerator: true,
        corejs: false,
        useESModules: true,
      },
    ],
    [
      expect.stringContaining(path.join(`@babel`, `plugin-transform-spread`)),
      {
        loose: false,
      },
    ],
    expect.stringContaining(`babel-plugin-dynamic-import-node`),
  ])
})

it(`Allows to configure browser targets`, () => {
  const targets = `last 1 version`
  const { presets } = preset(null, {
    targets,
  })

  expect(presets[0]).toEqual([
    expect.stringContaining(path.join(`@babel`, `preset-env`)),
    {
      exclude: [`transform-typeof-symbol`],
      corejs: 2,
      loose: true,
      modules: false,
      useBuiltIns: `usage`,
      targets,
    },
  ])
})

describe(`in production mode`, () => {
  it(`adds babel-plugin-transform-react-remove-prop-types`, () => {
    process.env.GATSBY_BUILD_STAGE = `build-javascript`

    const { plugins } = preset()

    expect(plugins).toEqual(
      expect.arrayContaining([
        [
          expect.stringContaining(
            path.join(`babel-plugin-transform-react-remove-prop-types`)
          ),
          {
            removeImport: true,
          },
        ],
      ])
    )
  })
})
