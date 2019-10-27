module.exports = (state = new Set(), action) => {
  switch (action.type) {
    case `ADD_STATIC_QUERY_TO_APP`: {
      state.add(action.payload.hash)
      return state
    }
    default:
      return state
  }
}
