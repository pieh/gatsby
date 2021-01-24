const { spawn } = require(`child_process`)
const path = require(`path`)
const { murmurhash } = require(`babel-plugin-remove-graphql-queries`)
const { readPageData } = require(`gatsby/dist/utils/page-data`)
const { stripIgnoredCharacters } = require(`gatsby/graphql`)
const fs = require(`fs-extra`)

jest.setTimeout(100000)

const publicDir = path.join(process.cwd(), `public`)

const gatsbyBin = path.join(`node_modules`, `.bin`, `gatsby`)

const manifest = {}

function runGatsbyWithRunTestSetup(runNumber = 1) {
  return function beforeAllImpl() {
    return new Promise(resolve => {
      const gatsbyProcess = spawn(gatsbyBin, [`build`, `--write-to-file`], {
        stdio: [`inherit`, `inherit`, `inherit`, `inherit`],
        env: {
          ...process.env,
          NODE_ENV: `production`,
          GATSBY_EXPERIMENTAL_PAGE_BUILD_ON_DATA_CHANGES: `1`, // temporary - will remove when mode is made default,
          ARTIFACTS_RUN_SETUP: runNumber.toString(),
        },
      })

      gatsbyProcess.on(`exit`, () => {
        manifest[runNumber] = {
          generated: fs
            .readFileSync(
              path.join(process.cwd(), `.cache`, `newPages.txt`),
              `utf-8`
            )
            .split(`\n`)
            .filter(Boolean),
          removed: fs
            .readFileSync(
              path.join(process.cwd(), `.cache`, `deletedPages.txt`),
              `utf-8`
            )
            .split(`\n`)
            .filter(Boolean),
          allPages: fs.readJSONSync(
            path.join(process.cwd(), `.cache`, `test-pages.json`)
          ),
        }

        resolve()
      })
    })
  }
}

const titleQuery = `
  {
    site {
      siteMetadata {
        title
      }
    }
  }
`

const authorQuery = `
  {
    site {
      siteMetadata {
        author
      }
    }
  }
`

const githubQuery = `
  {
    site {
      siteMetadata {
        github
      }
    }
  }
`

const moreInfoQuery = `
  {
    site {
      siteMetadata {
        moreInfo
      }
    }
  }
`

function hashQuery(query) {
  const text = stripIgnoredCharacters(query)
  const hash = murmurhash(text, `abc`)
  return String(hash)
}

const globalQueries = [githubQuery, moreInfoQuery]

const pagePathToFilePath = {
  html: pagePath => path.join(`public`, pagePath, `index.html`),
  "page-data": pagePath =>
    path.join(
      `public`,
      `page-data`,
      pagePath === `/` ? `index` : pagePath,
      `page-data.json`
    ),
}

function assertFileExistenceForPagePaths({ pagePaths, type, shouldExist }) {
  if (![`html`, `page-data`].includes(type)) {
    throw new Error(`Unexpected type`)
  }

  test.each(pagePaths)(
    `${type} file for "%s" ${shouldExist ? `exists` : `DOESN'T exist`}`,
    async pagePath => {
      const filePath = pagePathToFilePath[type](pagePath)
      const exists = await new Promise(resolve => {
        fs.stat(filePath, err => {
          resolve(err === null)
        })
      })

      expect(exists).toBe(shouldExist)
    }
  )
}

beforeAll(done => {
  const gatsbyCleanProcess = spawn(gatsbyBin, [`clean`], {
    stdio: [`inherit`, `inherit`, `inherit`, `inherit`],
    env: {
      ...process.env,
      NODE_ENV: `production`,
    },
  })

  gatsbyCleanProcess.on(`exit`, () => {
    done()
  })
})

describe(`First run (baseline)`, () => {
  beforeAll(runGatsbyWithRunTestSetup(1))

  describe(`Static Queries`, () => {
    test(`are written correctly when inline`, async () => {
      const queries = [titleQuery, ...globalQueries]
      const pagePath = `/inline/`

      const { staticQueryHashes } = await readPageData(publicDir, pagePath)

      expect(staticQueryHashes.sort()).toEqual(queries.map(hashQuery).sort())
    })

    test(`are written correctly when imported`, async () => {
      const queries = [titleQuery, ...globalQueries]
      const pagePath = `/import/`

      const { staticQueryHashes } = await readPageData(publicDir, pagePath)

      expect(staticQueryHashes.sort()).toEqual(queries.map(hashQuery).sort())
    })

    test(`are written correctly when dynamically imported`, async () => {
      const queries = [titleQuery, ...globalQueries]
      const pagePath = `/dynamic/`

      const { staticQueryHashes } = await readPageData(publicDir, pagePath)

      expect(staticQueryHashes.sort()).toEqual(queries.map(hashQuery).sort())
    })

    test(`are written correctly in jsx`, async () => {
      const queries = [titleQuery, ...globalQueries]
      const pagePath = `/jsx/`

      const { staticQueryHashes } = await readPageData(publicDir, pagePath)

      expect(staticQueryHashes.sort()).toEqual(queries.map(hashQuery).sort())
    })

    test(`are written correctly in tsx`, async () => {
      const queries = [titleQuery, ...globalQueries]
      const pagePath = `/tsx/`

      const { staticQueryHashes } = await readPageData(publicDir, pagePath)

      expect(staticQueryHashes.sort()).toEqual(queries.map(hashQuery).sort())
    })

    test(`are written correctly in typescript`, async () => {
      const queries = [titleQuery, ...globalQueries]
      const pagePath = `/typescript/`

      const { staticQueryHashes } = await readPageData(publicDir, pagePath)

      expect(staticQueryHashes.sort()).toEqual(queries.map(hashQuery).sort())
    })

    test(`are written correctly when nesting imports`, async () => {
      const queries = [titleQuery, authorQuery, ...globalQueries]
      const pagePath = `/import-import/`

      const { staticQueryHashes } = await readPageData(publicDir, pagePath)

      expect(staticQueryHashes.sort()).toEqual(queries.map(hashQuery).sort())
    })

    test(`are written correctly when nesting dynamic imports`, async () => {
      const queries = [titleQuery, ...globalQueries]
      const pagePath = `/dynamic-dynamic/`

      const { staticQueryHashes } = await readPageData(publicDir, pagePath)

      expect(staticQueryHashes.sort()).toEqual(queries.map(hashQuery).sort())
    })

    test(`are written correctly when nesting a dynamic import in a regular import`, async () => {
      const queries = [titleQuery, authorQuery, ...globalQueries]
      const pagePath = `/import-dynamic/`

      const { staticQueryHashes } = await readPageData(publicDir, pagePath)

      expect(staticQueryHashes.sort()).toEqual(queries.map(hashQuery).sort())
    })

    test(`are written correctly when nesting a regular import in a dynamic import`, async () => {
      const queries = [titleQuery, ...globalQueries]
      const pagePath = `/dynamic-import/`

      const { staticQueryHashes } = await readPageData(publicDir, pagePath)

      expect(staticQueryHashes.sort()).toEqual(queries.map(hashQuery).sort())
    })

    test(`are written correctly with circular dependency`, async () => {
      const queries = [titleQuery, ...globalQueries]
      const pagePath = `/circular-dep/`

      const { staticQueryHashes } = await readPageData(publicDir, pagePath)

      expect(staticQueryHashes.sort()).toEqual(queries.map(hashQuery).sort())
    })

    test(`are written correctly when using gatsby-browser`, async () => {
      const queries = [...globalQueries]
      const pagePath = `/gatsby-browser/`

      const { staticQueryHashes } = await readPageData(publicDir, pagePath)

      expect(staticQueryHashes.sort()).toEqual(queries.map(hashQuery).sort())
    })
  })

  const expectedPages = [`stale-pages/stable`, `stale-pages/only-in-first`]
  const unexpectedPages = [`stale-pages/only-not-in-first`]

  describe(`html files`, () => {
    const type = `html`

    describe(`should have expected html files`, () => {
      assertFileExistenceForPagePaths({
        pagePaths: expectedPages,
        type,
        shouldExist: true,
      })
    })

    describe(`shouldn't have unexpected html files`, () => {
      assertFileExistenceForPagePaths({
        pagePaths: unexpectedPages,
        type,
        shouldExist: false,
      })
    })

    it(`should create all html files`, () => {
      expect(manifest[1].generated.sort()).toEqual(manifest[1].allPages.sort())
    })
  })

  describe(`page-data files`, () => {
    const type = `page-data`

    describe(`should have expected page-data files`, () => {
      assertFileExistenceForPagePaths({
        pagePaths: expectedPages,
        type,
        shouldExist: true,
      })
    })

    describe(`shouldn't have unexpected page-data files`, () => {
      assertFileExistenceForPagePaths({
        pagePaths: unexpectedPages,
        type,
        shouldExist: false,
      })
    })
  })
})

describe(`Second run (different pages created, data changed)`, () => {
  const expectedPagesToBeGenerated = [
    `/stale-pages/only-not-in-first`,
    `/page-query-changing-data-but-not-id/`,
    `/page-query-dynamic-2/`,
  ]

  const expectedPagesToRemainFromPreviousBuild = [
    `/stale-pages/stable/`,
    `/page-query-stable/`,
    `/page-query-changing-but-not-invalidating-html/`,
  ]

  const expectedPages = [
    // this page should remain from first build
    ...expectedPagesToRemainFromPreviousBuild,
    // those pages should have been (re)created
    ...expectedPagesToBeGenerated,
  ]

  const unexpectedPages = [
    `/stale-pages/only-in-first/`,
    `/page-query-dynamic-1/`,
  ]

  beforeAll(runGatsbyWithRunTestSetup(2))

  describe(`html files`, () => {
    const type = `html`

    describe(`should have expected html files`, () => {
      assertFileExistenceForPagePaths({
        pagePaths: expectedPages,
        type,
        shouldExist: true,
      })
    })

    describe(`shouldn't have unexpected html files`, () => {
      assertFileExistenceForPagePaths({
        pagePaths: unexpectedPages,
        type,
        shouldExist: false,
      })
    })

    it(`should recreate only some html files`, () => {
      expect(manifest[2].generated.sort()).toEqual(
        expectedPagesToBeGenerated.sort()
      )
    })
  })

  describe(`page-data files`, () => {
    const type = `page-data`

    describe(`should have expected page-data files`, () => {
      assertFileExistenceForPagePaths({
        pagePaths: expectedPages,
        type,
        shouldExist: true,
      })
    })

    describe(`shouldn't have unexpected page-data files`, () => {
      assertFileExistenceForPagePaths({
        pagePaths: unexpectedPages,
        type,
        shouldExist: false,
      })
    })
  })
})

describe(`Third run (js change, all pages are recreated)`, () => {
  const expectedPages = [
    `/stale-pages/only-not-in-first`,
    `/page-query-dynamic-3/`,
  ]

  const unexpectedPages = [
    `/stale-pages/only-in-first/`,
    `/page-query-dynamic-1/`,
    `/page-query-dynamic-2/`,
  ]

  let changedFileOriginalContent
  const changedFileAbspath = path.join(
    process.cwd(),
    `src`,
    `pages`,
    `gatsby-browser.js`
  )

  beforeAll(async () => {
    // make change to some .js
    changedFileOriginalContent = fs.readFileSync(changedFileAbspath, `utf-8`)

    const newContent = changedFileOriginalContent.replace(/sad/g, `not happy`)

    if (newContent === changedFileOriginalContent) {
      throw new Error(`Test setup failed`)
    }

    fs.writeFileSync(changedFileAbspath, newContent)
    await runGatsbyWithRunTestSetup(3)()
  })

  afterAll(() => {
    fs.writeFileSync(changedFileAbspath, changedFileOriginalContent)
  })

  describe(`html files`, () => {
    const type = `html`

    describe(`should have expected html files`, () => {
      assertFileExistenceForPagePaths({
        pagePaths: expectedPages,
        type,
        shouldExist: true,
      })
    })

    describe(`shouldn't have unexpected html files`, () => {
      assertFileExistenceForPagePaths({
        pagePaths: unexpectedPages,
        type,
        shouldExist: false,
      })
    })

    it(`should recreate all html files`, () => {
      expect(manifest[3].generated.sort()).toEqual(manifest[3].allPages.sort())
    })
  })

  describe(`page-data files`, () => {
    const type = `page-data`

    describe(`should have expected page-data files`, () => {
      assertFileExistenceForPagePaths({
        pagePaths: expectedPages,
        type,
        shouldExist: true,
      })
    })

    describe(`shouldn't have unexpected page-data files`, () => {
      assertFileExistenceForPagePaths({
        pagePaths: unexpectedPages,
        type,
        shouldExist: false,
      })
    })
  })
})
