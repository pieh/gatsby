const { getNodeMeta } = require(`../../db/nodes`)

exports.createResolvers = ({ createResolvers, store, getNode }) => {
  createResolvers({
    Query: {
      _editableNodesOnPage: {
        type: `JSON`,
        args: {
          path: {
            type: `String!`,
          },
        },
        resolve: async (source, args, context, info) => {
          const { componentDataDependencies } = store.getState()

          const usedNodesIds = new Set()
          componentDataDependencies.nodes.forEach((pathSet, nodeId) => {
            if (pathSet.has(args.path)) {
              usedNodesIds.add(nodeId)
            }
          })

          // we have all used nodes - now let's try to find top level ones (for example used nodes can be Mdx, but we do want to edit File which is a parent node)
          const editableNodes = new Map()

          for (let nodeId of usedNodesIds) {
            const originalNodeId = nodeId
            let node
            // let lastNode = null
            while (nodeId) {
              const tmpNode = getNode(nodeId)
              if (!tmpNode) {
                break
              }

              if (editableNodes.has(tmpNode.id)) {
                node = undefined
                break
              }

              nodeId = tmpNode.parent
              node = tmpNode
            }

            if (node) {
              const nodeMeta = await getNodeMeta(node)
              if (nodeMeta) {
                const editable = {
                  id: node.id,
                  originalNodeId,
                  type: node.internal.type,
                  description: node.internal.description,
                  ...nodeMeta,
                }

                // --- This should be somehow defined in plugins that create those types
                // if (editable.type === `File`) {
                //   editable.file = node.absolutePath
                // } else if (editable.type === `Site`) {
                //   const gatsbyConfigPath = path.join(
                //     program.directory,
                //     `gatsby-config.js`
                //   )
                //   editable.file = gatsbyConfigPath
                // }

                editableNodes.set(node.id, editable)
              }
            }
          }

          return {
            nodeIds: Array.from(editableNodes.values()),
          }
        },
      },
    },
  })
}
