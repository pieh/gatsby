const omit = require(`lodash/omit`)

module.exports = (state = {}, action) => {
  switch (action.type) {
    case `SET_JSON_DATA_PATH`:
      state[action.payload.key] = action.payload.value
      return state
    case `DELETE_JSON_DATA_PATHS`:
      return omit(state, action.payload.paths)
    default:
      return state
  }
}
