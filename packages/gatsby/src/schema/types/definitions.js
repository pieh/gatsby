const fs = require(`fs-extra`)
const { parse } = require(`graphql`)
const { store } = require(`../../redux`)
const createTypeName = require(`../create-type-name`)

const schemaDefTypeMap = {}

export function getSchemaDefTypeMap() {
  return schemaDefTypeMap
}

const buildTypeDef = field => {
  if (field.type.kind === `NonNullType`) {
    // We will discard non null hint
    // and just extract type from it
    return buildTypeDef(field.type)
  } else if (field.type.kind === `ListType`) {
    return {
      type: `List`,
      nodesType: buildTypeDef(field.type),
    }
  } else if (field.type.kind === `NamedType`) {
    const typeName = field.type.name.value

    // Add to type name vault to avoid using those names
    // by automatic type naming when infering field types
    createTypeName(typeName)

    return {
      type: typeName,
    }
  } else {
    // TODO: add support for more advanced type definitions (f.e. unions)
    return null
  }
}

const ScalarTypeNames = [`String`, `Float`, `Int`, `Boolean`, `Date`]

export function isScalarTypeDef(typeName) {
  return ScalarTypeNames.indexOf(typeName) !== -1
}

const parseSchemaDef = schemaDefText => {
  const ast = parse(schemaDefText)

  ast.definitions
    .filter(def => def.kind === `ObjectTypeDefinition`)
    .forEach(def => {
      // Iterating through types defined in schema
      const typeName = def.name.value

      // Builtin scalar type names are reserved and can't be redefined
      if (isScalarTypeDef(typeName)) {
        console.log(`Can't redefine "${typeName}" type in schema definition`)
        return
      }

      const typeFields = {}

      def.fields
        .filter(field => field.kind === `FieldDefinition`)
        .forEach(field => {
          // Iterating through fields in type
          const fieldType = buildTypeDef(field)
          if (fieldType) {
            typeFields[field.name.value] = fieldType
          }
        })

      // Append new fields to previous if type already has some fields defined.
      schemaDefTypeMap[typeName] = {
        ...(schemaDefTypeMap[typeName] || {}),
        ...typeFields,
      }
    })
}

export async function importSchemaDefinition() {
  try {
    // Read gatsby-schema.gql file placed in root directory of project.
    // This is just to get going quickly - later it should be changed to use
    // gatsby-node api and allow source plugins to supply schema definitions.

    const projectDirectory = store.getState().program.directory
    const schemaDefFilePath = `${projectDirectory}/gatsby-schema.gql`
    const schemaDefText = await fs.readFile(schemaDefFilePath, `utf8`)

    parseSchemaDef(schemaDefText)
  } catch (e) {
    // Just carry on if we cant read file
  }
}
