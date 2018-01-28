const { GraphQLList } = require(`graphql`)
const _ = require(`lodash`)

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
