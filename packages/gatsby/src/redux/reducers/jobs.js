const _ = require(`lodash`)
const { oneLine } = require(`common-tags`)
const moment = require(`moment`)
const slash = require(`slash`)
const debug = require(`debug`)(`gatsby:reducers:jobs`)

const validateJobAction = action => {
  if (!action.payload.id) {
    throw new Error(`An ID must be provided when creating or setting job`)
  }
}

module.exports = (
  state = { active: new Map(), done: new Map(), queued: new Map() },
  action
) => {
  switch (action.type) {
    case `CREATE_JOB_WITH_HANDLER`:
    case `CREATE_JOB`:
    case `SET_JOB`: {
      validateJobAction(action)

      if (action.payload.outputPath) {
        // normalize path
        action.payload.outputPath = slash(action.payload.outputPath)
      }

      if (action.type === `CREATE_JOB_WITH_HANDLER`) {
        debug(`CREATE_JOB_WITH_HANDLER ${action.payload.id}`)
        state.queued.set(action.payload.id, {
          ...action.payload,
          plugin: action.plugin,
        })
      } else {
        debug(`CREATE_JOB ${action.payload.id}`)
        state.active.set(action.payload.id, {
          ...(state.active.get(action.payload.id) || {}),
          ...action.payload,
          createdAt: Date.now(),
          plugin: action.plugin,
        })
      }
      return state
    }
    case `HANDLE_JOB`: {
      validateJobAction(action)
      debug(`HANDLE_JOB ${action.payload.id}`)
      state.active.set(action.payload.id, {
        ...state.queued.get(action.payload.id),
        createdAt: Date.now(),
      })
      state.queued.delete(action.payload.id)
      return state
    }
    case `END_JOB`: {
      validateJobAction(action)
      debug(`END_JOB ${action.payload.id}`)
      const completedAt = Date.now()
      const job = state.active.get(action.payload.id)
      if (!job) {
        throw new Error(oneLine`
          The plugin "${_.get(action, `plugin.name`, `anonymous`)}"
          tried to end a job with the id "${action.payload.id}"
          that either hasn't yet been created or has already been ended`)
      }

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
