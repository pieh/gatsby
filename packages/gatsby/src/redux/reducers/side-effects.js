const _ = require(`lodash`)

module.exports = (state = {}, action) => {
  switch (action.type) {
    case `SET_SIDE_EFFECT`: {
      const { queryID, ...rest } = action.payload
      if (!(queryID in state)) {
        state[queryID] = []
      }

      //      console.log(`registering side effect for query`, action.payload)
      const pluginSideEffects = state[queryID]
      state[queryID] = _.uniq(pluginSideEffects.concat(rest))
      return state
    }
    default:
      return state
  }
}
