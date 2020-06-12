exports.getNodeMeta = ({ node, getNode }) => {
  if (node.spaceId && node.contentful_id) {
    if (node.internal.type === `ContentfulAsset`) {
      return {
        description: `[Asset] ${
          node.node_locale ? `[${node.node_locale}] ` : ``
        }${node.title}`,
        editURL: `https://app.contentful.com/spaces/${node.spaceId}/assets/${node.contentful_id}`,
      }
    }

    const meta = {
      editURL: `https://app.contentful.com/spaces/${node.spaceId}/entries/${node.contentful_id}`,
    }

    if (node.contentfulType___NODE) {
      const typeNode = getNode(node.contentfulType___NODE)

      if (typeNode) {
        let title

        if (node[typeNode.displayField]) {
          title = node[typeNode.displayField]
        } else if (node[`${typeNode.displayField}___NODE`]) {
          const fieldNode = getNode(node[`${typeNode.displayField}___NODE`])

          if (fieldNode) {
            title = fieldNode.internal.content
          }
        }

        if (title) {
          meta.description = `[${typeNode.name}] ${
            node.node_locale ? `[${node.node_locale}] ` : ``
          }${title.toString()}`
        } else {
          meta.description = `[${typeNode.name}] ${
            node.node_locale ? `[${node.node_locale}] ` : ``
          }unnamed entry`
        }
      }
    }

    return meta
  }

  return null
}
