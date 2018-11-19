const { store } = require(`../redux`)

/**
 * Check if there are any jobs currently in progress
 *
 * @returns {boolean}
 */
const areAllJobsDone = () => store.getState().active.size === 0

module.exports = {
  areAllJobsDone,
}
