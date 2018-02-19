const { GraphQLList, GraphQLObjectType } = require(`graphql`)
const _ = require(`lodash`)

const { addTrackingToTmpObject } = require(`../node-tracking`)

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
      return fieldValue.map(value => {
        const tmpObject = { [resolveInfo.fieldName]: value }
        // add tracking to newly created array
        addTrackingToTmpObject(object, tmpObject)
        return resolve(tmpObject, args, context, resolveInfo)
      })
    }
  }

  return listType
}

// mutate current type, so types we already set will include new fields
function addFields(fields = {}) {
  this._typeConfig.fields = { ...fields, ...this._typeConfig.fields }
  this._fields = null
  this.getFields()
}

GraphQLObjectType.prototype.addFields = addFields
