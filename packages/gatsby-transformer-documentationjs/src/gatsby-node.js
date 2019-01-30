const documentation = require(`documentation`)
const remark = require(`remark`)
const _ = require(`lodash`)
const Prism = require(`prismjs`)

const stringifyMarkdownAST = (node = ``) => {
  if (_.isString(node)) {
    return node
  } else {
    return remark().stringify(node)
  }
}

const docId = (parentId, docsJson) =>
  `documentationJS ${parentId} path #${JSON.stringify(docsJson.path)}`
const descriptionId = (parentId, name) =>
  `${parentId}--DocumentationJSComponentDescription--${name}`

function prepareDescriptionNode(node, markdownStr, name, helpers) {
  const { createNodeId, createContentDigest } = helpers

  const descriptionNode = {
    id: createNodeId(descriptionId(node.id, name)),
    parent: node.id,
    children: [],
    internal: {
      type: `DocumentationJSComponentDescription`,
      mediaType: `text/markdown`,
      content: markdownStr,
      contentDigest: createContentDigest(markdownStr),
    },
  }

  node.children = node.children.concat([descriptionNode.id])

  return descriptionNode
}

/**
 * Implement the onCreateNode API to create documentation.js nodes
 * @param {Object} super this is a super param
 */
exports.onCreateNode = async ({ node, actions, ...helpers }) => {
  const { createNodeId, createContentDigest } = helpers
  const { createNode, createParentChildLink } = actions

  if (
    node.internal.mediaType !== `application/javascript` ||
    node.internal.type !== `File`
  ) {
    return null
  }

  let documentationJson
  try {
    documentationJson = await documentation.build(node.absolutePath, {
      shallow: true,
    })
  } catch (e) {
    // Ignore as there'll probably be other tooling already checking for errors
    // and an error here kills Gatsby.
  }

  if (documentationJson && documentationJson.length > 0) {
    const handledDocs = new WeakMap()
    const typeDefs = new Map()

    const getNodeIDForType = typeName => {
      if (typeDefs.has(typeName)) {
        return typeDefs.get(typeName)
      }

      const index = documentationJson.findIndex(
        docsJson =>
          docsJson.name === typeName &&
          [`typedef`, `constant`].includes(docsJson.kind)
      )

      if (index !== -1) {
        return createNodeForDocs(documentationJson[index], index)
      }

      return null
    }

    const createNodeForDocs = (docsJson, commentNumber = null) => {
      if (handledDocs.has(docsJson)) {
        // this was already handled
        return handledDocs.get(docsJson)
      }

      const docSkeletonNode = {
        commentNumber,
        id: createNodeId(docId(node.id, docsJson)),
        parent: node.id,
        children: [],
        internal: {
          type: `DocumentationJs`,
        },
      }

      const childrenNode = []

      const picked = _.pick(docsJson, [
        `kind`,
        `memberof`,
        `name`,
        `scope`,
        `type`,
        `default`,
      ])

      if (picked.type && picked.name !== picked.type.name) {
        picked.type.typeDef___NODE = getNodeIDForType(docsJson.type.name)
      }

      const mdFields = [`description`, `deprecated`]

      mdFields.forEach(fieldName => {
        if (docsJson[fieldName]) {
          const childNode = prepareDescriptionNode(
            docSkeletonNode,
            stringifyMarkdownAST(docsJson[fieldName]),
            `comment.${fieldName}`,
            helpers
          )
          childrenNode.push(childNode)
          picked[`${fieldName}___NODE`] = childNode.id
        }
      })

      const docsSubfields = [`params`, `properties`, `returns`]
      docsSubfields.forEach(fieldName => {
        if (docsJson[fieldName] && docsJson[fieldName].length > 0) {
          picked[`${fieldName}___NODE`] = docsJson[fieldName].map(
            (docObj, fieldIndex) => {
              // When documenting destructured parameters, the name
              // is parent.child where we just want the child.
              if (docObj.name && docObj.name.split(`.`).length > 1) {
                docObj.name = docObj.name
                  .split(`.`)
                  .slice(-1)
                  .join(`.`)
              }

              const adjustedObj = {
                ...docObj,
                path: [...docsJson.path, { fieldName, fieldIndex }],
              }
              return createNodeForDocs(adjustedObj)
            }
          )
        }
      })

      if (_.isPlainObject(docsJson.members)) {
        /*
        docsJson.members = {
          events: [],
          global: [],
          inner: [],
          instance: [],
          static: [],
        }
        each member type has array of jsdocs in same shape as top level jsdocs
        so we use same transformation as top level ones
        */
        picked.members = _.reduce(
          docsJson.members,
          (acc, membersOfType, key) => {
            if (membersOfType.length > 0) {
              acc[`${key}___NODE`] = membersOfType.map(member =>
                createNodeForDocs(member)
              )
            }
            return acc
          },
          {}
        )
      }

      if (docsJson.examples) {
        picked.examples = docsJson.examples.map(example => {
          return {
            raw: example.description,
            highlighted: Prism.highlight(
              example.description,
              Prism.languages.javascript
            ),
          }
        })
      }

      const docNode = {
        ...docSkeletonNode,
        ...picked,
      }
      docNode.internal.contentDigest = createContentDigest(picked)

      createParentChildLink({
        parent: node,
        child: docNode,
      })

      if (docNode.kind === `typedef`) {
        typeDefs.set(docNode.name, docNode.id)
      }

      createNode(docNode)
      childrenNode.forEach(childNode => {
        createNode(childNode)
      })
      handledDocs.set(docsJson, docNode.id)
      return docNode.id
    }

    documentationJson.forEach(createNodeForDocs)
    return true
  } else {
    return null
  }
}
