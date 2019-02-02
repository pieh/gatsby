const execa = require(`execa`)
const { resolve } = require(`path`)

const {
  clearTestOutput,
  getTestInputs,
  readTestOutput,
} = require(`../test-utils`)

const rootPath = resolve(`${__dirname}/..`)

describe(`Query running`, () => {
  const dbEngines = [`redux`, `loki`]

  clearTestOutput()
  const testInputs = getTestInputs()

  // do both builds first
  dbEngines.forEach(dbEngine => {
    execa.shellSync(`yarn clean-and-build`, {
      cwd: rootPath,
      env: { GATSBY_DB_NODES: dbEngine },
    })
  })

  testInputs.forEach(testInput => {
    describe(testInput.name, () => {
      const [reduxResults, lokiResults] = dbEngines.map(dbEngine =>
        readTestOutput(testInput, dbEngine)
      )

      it(`Using redux matches snapshot`, () => {
        expect(reduxResults).toMatchSnapshot()
      })
      it(`Using loki matches redux`, () => {
        expect(lokiResults).toEqual(reduxResults)
      })
    })
  })
})
