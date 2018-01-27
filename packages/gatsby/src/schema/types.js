const fs = require(`fs-extra`)
const { parse } = require(`graphql`)
const {
  GraphQLList,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLObjectType,
} = require(`graphql`)
const _ = require(`lodash`)
const { store } = require(`../redux`)
const createTypeName = require(`./create-type-name`)
const DateType = require(`./types/type-date`)
const FileType = require(`./types/type-file`)

const schemaDefTypeMap = {}

exports.schemaDefTypeMap = schemaDefTypeMap

const buildTypeDef = field => {
  if (field.type.kind === `NonNullType`) {
    // we will discard non null hint
    // and just extract type from it
    return buildTypeDef(field.type)
  } else if (field.type.kind === `ListType`) {
    return {
      type: `List`,
      nodesType: buildTypeDef(field.type),
    }
  } else if (field.type.kind === `NamedType`) {
    const typeName = field.type.name.value

    // add to type name vault to avoid using those names
    // by automatic type naming when infering field types
    createTypeName(typeName)

    return {
      type: typeName,
    }
  } else {
    // TODO - add support for more advanced type definitions (f.e. unions)
    return null
  }
}

const parseSchemaDef = schemaDefText => {
  const ast = parse(schemaDefText)

  ast.definitions
    .filter(def => def.kind === `ObjectTypeDefinition`)
    .forEach(def => {
      // iterating through types defined in schema
      const typeFields = {}

      def.fields
        .filter(field => field.kind === `FieldDefinition`)
        .forEach(field => {
          // iterating through fields in type
          const fieldType = buildTypeDef(field)
          if (fieldType) {
            typeFields[field.name.value] = fieldType
          }
        })

      // Append new fields to previous if type already has some fields defined.
      schemaDefTypeMap[def.name.value] = {
        ...(schemaDefTypeMap[def.name.value] || {}),
        ...typeFields,
      }
    })
}

exports.importForcedTypes = async () => {
  try {
    // Read gatsby-schema.gql file placed in root directory of project.
    // This is just to get going quickly - later it should be changed to use
    // gatsby-node api and allow source plugins to supply schema definitions.

    const projectDirectory = store.getState().program.directory
    const schemaDefFilePath = `${projectDirectory}/gatsby-schema.gql`
    const schemaDefText = await fs.readFile(schemaDefFilePath, `utf8`)

    parseSchemaDef(schemaDefText)
  } catch (e) {
    // just carry on if we cant read file
  }

  return schemaDefTypeMap
}

export function wrapFieldInList(field) {
  if (!_.isPlainObject(field)) {
    return null
  }

  const { type, args = null, resolve = null } = field

  const listType = { type: new GraphQLList(type), args }

  if (resolve) {
    // If inferredType has resolve function wrap it with Array.map
    listType.resolve = (object, args, context, resolveInfo) => {
      const fieldValue = object[resolveInfo.fieldName]
      if (!fieldValue) {
        return null
      }

      // Field resolver expects first parameter to be plain object
      // containing key with name of field we want to resolve.
      return fieldValue.map(value =>
        resolve({ [resolveInfo.fieldName]: value }, args, context, resolveInfo)
      )
    }
  }

  return listType
}

const graphQLNodeTypes = {}
exports.registerGraphQLNodeType = type => {
  graphQLNodeTypes[type.name] = type

  registerGraphQLType(type.name, {
    type: type.nodeObjectType,
  })

  // special case to construct linked file type used by type inferring
  if (type.name === `File`) {
    FileType.setFileNodeRootType(type.nodeObjectType)
  }
}

export function getNodeType(typeName) {
  return graphQLNodeTypes[typeName]
}

const graphQLTypeMap = {}
function registerGraphQLType(typeName, type) {
  graphQLTypeMap[typeName] = type
  return type
}
exports.registerGraphQLType = registerGraphQLType

export function getGraphQLType(schemaDefType) {
  if (schemaDefType.type === `List`) {
    if (schemaDefType.nodesType.type === `File`) {
      return FileType.getListType()
    }

    return wrapFieldInList(getGraphQLType(schemaDefType.nodesType))
  } else if (schemaDefType.type === `String`) {
    return { type: GraphQLString }
  } else if (schemaDefType.type === `Float`) {
    return { type: GraphQLFloat }
  } else if (schemaDefType.type === `Int`) {
    return { type: GraphQLInt }
  } else if (schemaDefType.type === `Boolean`) {
    return { type: GraphQLBoolean }
  } else if (schemaDefType.type === `File`) {
    return FileType.getType()
  } else if (schemaDefType.type === `Date`) {
    return DateType.getType()
  }

  if (schemaDefType.type in graphQLTypeMap) {
    return graphQLTypeMap[schemaDefType.type]
  }

  if (schemaDefType.type in schemaDefTypeMap) {
    return {
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
  }

  return null
}
