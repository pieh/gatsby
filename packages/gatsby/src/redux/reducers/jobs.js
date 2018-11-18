const _ = require(`lodash`)
const { oneLine } = require(`common-tags`)
const moment = require(`moment`)

const validateJobAction = action => {
  if (!action.payload.id) {
    throw new Error(`An ID must be provided when creating or setting job`)
  }
}

module.exports = (state = { active: new Map(), done: new Map() }, action) => {
  switch (action.type) {
    case `CREATE_JOB`:
    case `SET_JOB`: {
      validateJobAction(action)

      const mergedJob = _.merge(state.active.get(action.payload.id), {
        ...action.payload,
        createdAt: Date.now(),
        plugin: action.plugin,
      })
      state.active.set(action.payload.id, mergedJob)
      return state
    }
    case `END_JOB`: {
      validateJobAction(action)

      const job = state.active.get(action.payload.id)
      if (!job) {
        throw new Error(oneLine`
          The plugin "${_.get(action, `plugin.name`, `anonymous`)}"
          tried to end a job with the id "${action.payload.id}"
          that either hasn't yet been created or has already been ended`)
      }

      const completedAt = Date.now()

      state.active.delete(action.payload.id)
      state.done.set(action.payload.id, {
        ...job,
        completedAt,
        runTime: moment(completedAt).diff(moment(job.createdAt)),
      })
      return state
    }
  }

  return state
}
