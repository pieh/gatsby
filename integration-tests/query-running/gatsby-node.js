const nodes = require(`./nodes-data`)
const runQueries = require(`./run-queries`)

exports.sourceNodes = ({ actions, createContentDigest }) => {
  const { createNode } = actions

  nodes.forEach(node => {
    node.internal.contentDigest = createContentDigest(node)
    createNode(node)
  })
}

exports.createPages = async ({ graphql }) => {
  await runQueries(graphql)
}
