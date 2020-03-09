// const React = require(`react`)
const { join } = require(`path`)

jest.mock(`../match-paths.json`, () => [], { virtual: true })

jest.mock(`@reach/router`, () => {
  return {
    ...jest.requireActual(`@reach/router`),
    BaseContext: {
      Provider: ({ children }) => children,
    },
  }
})

const waitForExpect = require(`wait-for-expect`)

jest.mock(`@mikaelkristiansson/domready`, () => jest.fn(cb => cb()))

let mockElement
jest.mock(`react-dom`, () => {
  return {
    hydrate: jest.fn(element => {
      mockElement = element
    }),
  }
})

global.__BASE_PATH__ = ``
global.__PATH_PREFIX__ = ``

const MOCK_FILE_INFO = {
  [`${process.cwd()}/public/webpack.stats.json`]: `{}`,
  [`${process.cwd()}/public/chunk-map.json`]: `{}`,
  [join(
    process.cwd(),
    `/public/page-data/index/page-data.json`
  )]: JSON.stringify({
    componentChunkName: `test`,
    path: `/`,
    webpackCompilationHash: `1234567890abcdef1234`,
  }),
  [join(process.cwd(), `/public/page-data/app-data.json`)]: JSON.stringify({
    webpackCompilationHash: `1234567890abcdef1234`,
  }),
}

// global.plugins = []

describe(`Production runtime hydration`, () => {
  beforeEach(() => {
    jest.resetModules()
    // renderToStringSpy.mockClear()
  })

  const getSSRandBrowserMarkup = async fixture => {
    const fixturePath = join(__dirname, `fixtures`, `hydration`, fixture)
    const mockComponent = require(join(fixturePath, `component.js`)).default
    jest.doMock(`../loader`, () => {
      const pageMetadata = {
        status: `success`,
        page: {
          componentChunkName: `test`,
          path: `/`,
        },
        json: {
          data: {
            foo: `bar`,
          },
          pageContext: {
            foo: `baz`,
          },
        },
        component: mockComponent,
      }

      class ProdLoader {
        setApiRunner = jest.fn()

        loadPage = jest.fn(path => Promise.resolve(pageMetadata))
        loadPageSync = jest.fn(path => pageMetadata)
      }

      return {
        ...jest.requireActual(`../loader`),
        ProdLoader,
      }
    })

    jest.mock(
      `../async-requires`,
      () => {
        return {
          components: {
            test: () => Promise.resolve(mockComponent),
          },
        }
      },
      { virtual: true }
    )

    jest.mock(
      `../sync-requires`,
      () => {
        return {
          components: {
            test: mockComponent,
          },
        }
      },
      { virtual: true }
    )

    jest.mock(`fs`, () => {
      const fs = jest.requireActual(`fs`)
      return {
        ...fs,
        readFileSync: jest.fn(),
      }
    })

    const fs = require(`fs`)

    const ReactDOMServer = require(`react-dom/server`)

    const renderToStringSpy = jest.spyOn(ReactDOMServer, `renderToString`)

    fs.readFileSync.mockImplementation(file => MOCK_FILE_INFO[file])

    const StaticEntry = require(`../static-entry`).default

    global.plugins = [
      {
        plugin: require(join(fixturePath, `gatsby-ssr.js`)),
        options: {},
      },
    ]

    jest.doMock(`../api-runner-browser-plugins`, () => [
      {
        plugin: require(join(fixturePath, `gatsby-browser.js`)),
        options: {},
      },
    ])

    const ssrMarkup = await new Promise(resolve => {
      StaticEntry(`/`, () => {
        resolve(renderToStringSpy.mock.results[0].value)
      })
    })

    const ReactDOM = require(`react-dom`)
    const { renderToStaticMarkup } = require(`react-dom/server`)
    require(`../production-app`)

    await waitForExpect(() => {
      expect(ReactDOM.hydrate).toBeCalled()
    })

    const browserMarkup = renderToStaticMarkup(mockElement)

    return { ssrMarkup, browserMarkup }
  }

  test(`hello world`, async () => {
    const { ssrMarkup, browserMarkup } = await getSSRandBrowserMarkup(
      `hello-world`
    )

    expect(ssrMarkup).toMatchInlineSnapshot(
      `"<div style=\\"outline:none\\" tabindex=\\"-1\\" id=\\"gatsby-focus-wrapper\\"><div>Hello world</div></div>"`
    )
    expect(ssrMarkup).toEqual(browserMarkup)
  })

  test(`with wraps`, async () => {
    const { ssrMarkup, browserMarkup } = await getSSRandBrowserMarkup(
      `with-wraps`
    )

    expect(ssrMarkup).toMatchInlineSnapshot(
      `"<div data-reactroot=\\"\\">wrapRootElement before</div><div style=\\"outline:none\\" tabindex=\\"-1\\" id=\\"gatsby-focus-wrapper\\"><div>wrapPageElement before</div><div>With wraps</div><div>wrapPageElement after</div></div><div data-reactroot=\\"\\">wrapRootElement after</div>"`
    )
    expect(ssrMarkup).toEqual(browserMarkup)
  })
})
