// @flow
const {
  GraphQLInputObjectType,
  GraphQLBoolean,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
} = require(`graphql`)
const { oneLine } = require(`common-tags`)
const _ = require(`lodash`)
const invariant = require(`invariant`)
const typeOf = require(`type-of`)
const createTypeName = require(`./create-type-name`)
const createKey = require(`./create-key`)
const {
  getExampleValues,
  extractFieldNames,
  isEmptyObjectOrArray,
  INVALID_VALUE,
} = require(`./data-tree-utils`)

const { findLinkedNode } = require(`./infer-graphql-type`)
const { getNodes, store } = require(`../redux`)
const is32BitInteger = require(`../utils/is-32-bit-integer`)

import type {
  GraphQLInputFieldConfig,
  GraphQLInputFieldConfigMap,
} from "graphql/type/definition"

function typeFields(type): GraphQLInputFieldConfigMap {
  switch (type) {
    case `boolean`:
      return {
        eq: { type: GraphQLBoolean },
        ne: { type: GraphQLBoolean },
        in: { type: new GraphQLList(GraphQLBoolean) },
        nin: { type: new GraphQLList(GraphQLBoolean) },
      }
    case `string`:
      return {
        eq: { type: GraphQLString },
        ne: { type: GraphQLString },
        regex: { type: GraphQLString },
        glob: { type: GraphQLString },
        in: { type: new GraphQLList(GraphQLString) },
        nin: { type: new GraphQLList(GraphQLString) },
      }
    case `int`:
      return {
        eq: { type: GraphQLInt },
        ne: { type: GraphQLInt },
        gt: { type: GraphQLInt },
        gte: { type: GraphQLInt },
        lt: { type: GraphQLInt },
        lte: { type: GraphQLInt },
        in: { type: new GraphQLList(GraphQLInt) },
        nin: { type: new GraphQLList(GraphQLInt) },
      }
    case `float`:
      return {
        eq: { type: GraphQLFloat },
        ne: { type: GraphQLFloat },
        gt: { type: GraphQLFloat },
        gte: { type: GraphQLFloat },
        lt: { type: GraphQLFloat },
        lte: { type: GraphQLFloat },
        in: { type: new GraphQLList(GraphQLFloat) },
        nin: { type: new GraphQLList(GraphQLFloat) },
      }
  }
  return {}
}

function inferGraphQLInputFields({
  value,
  nodes,
  prefix,
  typeName,
  selector,
}): ?GraphQLInputFieldConfig {
  if (value == null || isEmptyObjectOrArray(value)) return null

  switch (typeOf(value)) {
    case `array`: {
      const headValue = value[0]
      let headType = typeOf(headValue)

      if (headType === `number`)
        headType = is32BitInteger(headValue) ? `int` : `float`

      // Determine type for in operator.
      let inType
      switch (headType) {
        case `int`:
          inType = GraphQLInt
          break
        case `float`:
          inType = GraphQLFloat
          break
        case `date`:
        case `string`:
          inType = GraphQLString
          break
        case `boolean`:
          inType = GraphQLBoolean
          break
        case `array`:
        case `object`: {
          let inferredField = inferGraphQLInputFields({
            value: headValue,
            prefix,
            nodes,
            selector,
            typeName,
          })
          invariant(
            inferredField,
            `Could not infer graphQL type for value: ${JSON.stringify(
              Object.keys(headValue)
            )}`
          )
          inType = inferredField.type
          break
        }
        default:
          invariant(
            false,
            oneLine`
              Could not infer an appropriate GraphQL input type
              for value: ${headValue} of type ${headType} along path: ${prefix}
            `
          )
      }

      let fields
      if (headType === `object`) {
        fields = {
          elemMatch: {
            type: inType,
          },
        }
      } else {
        fields = {
          ...typeFields(headType),
          in: { type: new GraphQLList(inType) },
        }
      }

      return {
        type: new GraphQLInputObjectType({
          name: createTypeName(`${prefix}QueryList`),
          fields,
        }),
      }
    }
    case `boolean`: {
      return {
        type: new GraphQLInputObjectType({
          name: createTypeName(`${prefix}QueryBoolean`),
          fields: typeFields(`boolean`),
        }),
      }
    }
    case `date`:
    case `string`: {
      return {
        type: new GraphQLInputObjectType({
          name: createTypeName(`${prefix}QueryString`),
          fields: typeFields(`string`),
        }),
      }
    }
    case `object`: {
      return {
        type: new GraphQLInputObjectType({
          name: createTypeName(`${prefix}InputObject`),
          fields: () =>
            inferInputObjectStructureFromNodes({
              nodes,
              prefix,
              exampleValue: value,
              selector,
              typeName,
            }).inferredFields,
        }),
      }
    }
    case `number`: {
      if (is32BitInteger(value)) {
        return {
          type: new GraphQLInputObjectType({
            name: createTypeName(`${prefix}QueryInteger`),
            fields: typeFields(`int`),
          }),
        }
      } else {
        return {
          type: new GraphQLInputObjectType({
            name: createTypeName(`${prefix}QueryFloat`),
            fields: typeFields(`float`),
          }),
        }
      }
    }
    default:
      return null
  }
}

const EXCLUDE_KEYS = {
  parent: 1,
  children: 1,
}

type InferInputOptions = {
  nodes: Object[],
  typeName?: string,
  prefix?: string,
  exampleValue?: Object,
}

// const recursiveOmitBy = (value, fn) => {
//   if (_.isObject(value)) {
//     if (_.isPlainObject(value)) {
//       value = _.omitBy(value, fn)
//     } else if (_.isArray(value)) {
//       // don't mutate original value
//       value = _.clone(value)
//     }
//     _.each(value, (v, k) => {
//       value[k] = recursiveOmitBy(v, fn)
//     })
//     if (_.isEmpty(value)) {
//       // don't return empty objects - gatsby doesn't support these
//       return null
//     }
//   }
//   return value
// }

const RootNodeInputObjectMap = new Map()
const getRootNodeInputObject = ({ typeName, isArray }) => {
  const mapKey = `${typeName}_${isArray ? `[]` : ``}`
  if (RootNodeInputObjectMap.has(mapKey)) {
    return RootNodeInputObjectMap.get(mapKey)
  }

  const nodes = getNodes().filter(node => node.internal.type === typeName)
  const exampleValue = getExampleValues({
    nodes,
    typeName,
  })

  const field = inferGraphQLInputFields({
    nodes,
    value: isArray ? [exampleValue] : exampleValue,
    prefix: `Linked${typeName}${isArray ? `Array` : `Single`}`,
    typeName,
    selector: ``,
  })
  RootNodeInputObjectMap.set(mapKey, field)
  return field
}

export function inferInputObjectStructureFromNodes({
  nodes,
  typeName = ``,
  prefix = ``,
  selector = ``,
  exampleValue = null,
}: InferInputOptions): Object {
  const inferredFields = {}
  const isRoot = !prefix
  const config = store.getState().config
  const mapping = config && config.mapping

  prefix = isRoot ? typeName : prefix
  if (exampleValue === null) {
    // typeName includes "Connection" string, which is not what we want,
    // so extract type from first node
    exampleValue = getExampleValues({
      nodes,
      typeName:
        nodes && nodes[0] && nodes[0].internal && nodes[0].internal.type,
    })
  }

  _.each(exampleValue, (v, k) => {
    let value = v
    let key = k
    // Remove fields for traversing through nodes as we want to control
    // setting traversing up not try to automatically infer them.
    if (value === INVALID_VALUE || (isRoot && EXCLUDE_KEYS[key])) return

    // Several checks to see if a field is pointing to custom type
    // before we try automatic inference.
    const nextSelector = selector ? `${selector}.${key}` : key
    const fieldSelector = `${typeName}.${nextSelector}`

    let field
    if (mapping && _.includes(Object.keys(mapping), fieldSelector)) {
      field = getRootNodeInputObject({
        typeName: mapping[fieldSelector].split(`.`)[0],
        isArray: _.isArray(value),
      })
      console.log(`should map`, fieldSelector, k, v)
    } else if (_.includes(key, `___NODE`)) {
      // TODO: Union the objects in array
      const nodeToFind = _.isArray(value) ? value[0] : value
      const linkedNode = findLinkedNode(nodeToFind)

      field = getRootNodeInputObject({
        typeName: linkedNode.internal.type,
        isArray: _.isArray(value),
      })
      ;[key] = key.split(`___`)
    } else {
      field = inferGraphQLInputFields({
        nodes,
        value,
        prefix: `${prefix}${_.upperFirst(key)}`,
        typeName,
        selector: nextSelector,
      })
    }

    if (field == null) return
    inferredFields[createKey(key)] = field
  })

  // Add sorting (but only to the top level).
  let sort = []
  if (isRoot) {
    sort = extractFieldNames(nodes)
  }

  return { inferredFields, sort }
}
