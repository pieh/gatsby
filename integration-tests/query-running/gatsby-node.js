const nodes = require(`./nodes-data`)
const runQueries = require(`./run-queries`)
const { printSchema } = require(`gatsby/graphql`)
const fs = require(`fs-extra`)
const path = require(`path`)
const child_process = require(`child_process`)

exports.onPreInit = ({ reporter }) => {
  reporter.info(`Building with GATSBY_DB_NODES=${process.env.GATSBY_DB_NODES}`)
}

exports.sourceNodes = ({ actions, createContentDigest }) => {
  const { createNode } = actions

  nodes.forEach(node => {
    node.internal.contentDigest = createContentDigest(node)
    createNode(node)
  })
}

exports.createPages = async ({ store, graphql }) => {
  const schemaString = printSchema(store.getState().schema, {
    commentDescriptions: true,
  })

  const schemaPath = path.join(process.cwd(), `.cache`, `schema.graphql`)

  await fs.outputFile(schemaPath, schemaString)
  try {
    const output = child_process.execFileSync(`npm run generate-queries`, {
      encoding: `utf-8`,
    })
    console.log(output)
  } catch (e) {
    console.error(e)
  }

  await runQueries(graphql)
}
