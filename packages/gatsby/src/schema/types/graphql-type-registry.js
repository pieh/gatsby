const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLBoolean,
} = require(`graphql`)
const _ = require(`lodash`)

const { getSchemaDefTypeMap } = require(`./definitions`)
const { wrapFieldInList } = require(`./graphql-type-utils`)
const DateType = require(`./type-date`)
const FileType = require(`./type-file`)

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
  // TO-DO: add resolver that will try to link to nodes
  // now fields with this type will return null
  registerGraphQLType(type.name, {
    type: type.nodeObjectType,
  })

  // special case to construct linked file type used by type inferring
  if (type.name === `File`) {
    FileType.setFileNodeRootType(type.nodeObjectType)
  }
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

    const { resolve, ...rest } = wrapFieldInList(
      getGraphQLType(schemaDefType.nodesType)
    )

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
        }

        // Use custom resolver if list have one (f.e. list of dates)
        if (resolve) {
          return resolve(
            { [fieldName]: value },
            fieldArgs,
            context,
            resolveInfo
          )
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
  const schemaDefTypeMap = getSchemaDefTypeMap()
  if (schemaDefType.type in schemaDefTypeMap) {
    const type = {
      type: new GraphQLObjectType({
        name: schemaDefType.type,
        fields: _.mapValues(schemaDefTypeMap[schemaDefType.type], typeDef =>
          getGraphQLType(typeDef)
        ),
      }),
      resolve(object, fieldArgs, context, { fieldName }) {
        return _.isPlainObject(object[fieldName]) ? object[fieldName] : null
      },
    }

    // Register type for later use
    registerGraphQLType(schemaDefType.type, type)

    return type
  }

  return null
}
