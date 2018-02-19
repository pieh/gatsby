const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLUnionType,
} = require(`graphql`)
const _ = require(`lodash`)

const { getNode } = require(`../../redux`)
const {
  createPageDependency,
} = require(`../../redux/actions/add-page-dependency`)
const { getSchemaDefTypeMap } = require(`./definitions`)
const { wrapFieldInList } = require(`./graphql-type-utils`)
const DateType = require(`./type-date`)
const FileType = require(`./type-file`)
const { addTrackingToTmpObject } = require(`../node-tracking`)

let graphQLTypeMap = {}

export function initTypeRegistry() {
  graphQLTypeMap = {}

  // Reset stored File type to not point to outdated type definition
  FileType.setFileNodeRootType(null)

  // Register scalar types

  // Common resolver for scalar types
  const scalarResolve = (object, args, context, { fieldName }) => {
    const value = object[fieldName]

    if (_.isObject(value)) {
      // We don't want to show "[object Object]" or throw errors
      // if value is not scalar
      return null
    }

    return value
  }

  registerGraphQLType(`String`, {
    type: GraphQLString,
    resolve: scalarResolve,
  })

  registerGraphQLType(`Float`, {
    type: GraphQLFloat,
    resolve: scalarResolve,
  })

  registerGraphQLType(`Int`, {
    type: GraphQLInt,
    resolve: scalarResolve,
  })

  registerGraphQLType(`Boolean`, {
    type: GraphQLBoolean,
    resolve: scalarResolve,
  })

  registerGraphQLType(`Date`, DateType.getType())
}

export function registerGraphQLNodeType(type) {
  // special case to construct linked file type used by type inferring
  if (type.name === `File`) {
    FileType.setFileNodeRootType(type.nodeObjectType)
  }

  registerGraphQLType(type.name, {
    type: type.nodeObjectType,
    resolve(object, fieldArgs, { path }, { fieldName }) {
      const value = object[fieldName]
      if (!value) {
        return null
      }

      const linkedNode = getNode(value)
      if (linkedNode && linkedNode.internal.type === type.name) {
        createPageDependency({ path, nodeId: linkedNode.id })
        return linkedNode
      } else {
        return null
      }
    },
  })
}

export function registerGraphQLType(typeName, type) {
  graphQLTypeMap[typeName] = type
}

export function getGraphQLType(schemaDefType) {
  if (schemaDefType.type === `List`) {
    // Check if we have ready to use List<type> in our registry
    const ListTypeName = `[${schemaDefType.nodesType.type}]`
    if (ListTypeName in graphQLTypeMap) {
      return graphQLTypeMap[ListTypeName]
    }

    const listItemType = getGraphQLType(schemaDefType.nodesType)
    if (!listItemType) {
      return null
    }

    const { resolve, ...rest } = wrapFieldInList(listItemType)

    const wrappedListType = {
      ...rest,
      resolve(object, fieldArgs, context, resolveInfo) {
        const { fieldName } = resolveInfo
        let value = object[fieldName]
        if (!value) {
          return null
        }
        if (!_.isArray(value)) {
          // value is not an array, so wrap value in single element array
          value = [value]
          // add tracking to newly created array
          addTrackingToTmpObject(object, value)
        }

        // Use custom resolver if list have one (f.e. list of dates)
        if (resolve) {
          const tmpObject = { [fieldName]: value }
          addTrackingToTmpObject(object, tmpObject)
          return resolve(tmpObject, fieldArgs, context, resolveInfo)
        }

        return value
      },
    }

    // Register list type for later use
    registerGraphQLType(ListTypeName, wrappedListType)

    return wrappedListType
  }

  // Check if we have ready to use type in our registry
  if (schemaDefType.type in graphQLTypeMap) {
    return graphQLTypeMap[schemaDefType.type]
  }

  // If we don't have type in registry, check if type is defined in schema
  // definition and construct type
  const typeFromDefinition = createFromDefinition(schemaDefType.type)
  if (typeFromDefinition) {
    registerGraphQLType(schemaDefType.type, typeFromDefinition)
    return typeFromDefinition
  }

  return null
}

function createFromDefinition(typeName) {
  const schemaDefTypeMap = getSchemaDefTypeMap()
  if (typeName in schemaDefTypeMap.types) {
    return createObjectTypeFromDefinition(
      typeName,
      schemaDefTypeMap.types[typeName]
    )
  } else if (typeName in schemaDefTypeMap.unions) {
    return createUnionTypeFromDefinition(
      typeName,
      schemaDefTypeMap.unions[typeName]
    )
  }

  return null
}

function createObjectTypeFromDefinition(typeName, definition) {
  return {
    type: new GraphQLObjectType({
      name: typeName,
      fields: _.pickBy(
        _.mapValues(definition, typeDef => getGraphQLType(typeDef))
      ),
    }),
    resolve(object, fieldArgs, context, { fieldName }) {
      return _.isPlainObject(object[fieldName]) ? object[fieldName] : null
    },
  }
}

function createUnionTypeFromDefinition(typeName, typeNames) {
  const fieldTypes = typeNames
    .map(typeName => getGraphQLType({ type: typeName }))
    .filter(
      field => field && field.resolve && field.type && field.type.isTypeOf
    )

  if (fieldTypes.length === 0) {
    return null
  }

  const types = fieldTypes.map(field => field.type)

  return {
    type: new GraphQLUnionType({
      name: typeName,
      description: `Union interface for for types [${types
        .map(f => f.name)
        .join(`, `)}]`,
      types,
    }),
    resolve(object, fieldArgs, context, resolveInfo) {
      const { fieldName } = resolveInfo

      const val = object[fieldName]
      if (!val) {
        return null
      }

      let result = null
      if (
        !fieldTypes.some(
          field =>
            (result = field.resolve(object, fieldArgs, context, resolveInfo))
        )
      ) {
        return null
      }

      return result
    },
  }
}
