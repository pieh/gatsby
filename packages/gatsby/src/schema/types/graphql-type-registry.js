const {
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLBoolean,
} = require(`graphql`)
const _ = require(`lodash`)

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
