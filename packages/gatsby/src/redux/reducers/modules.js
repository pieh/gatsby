module.exports = (state = new Map(), action) => {
  switch (action.type) {
    case `REGISTER_MODULE`: {
      state.set(action.payload.id, {
        resource: action.payload.module,
        exportIdentifier: action.payload.export,
      })
      break
    }
  }
  return state
}
