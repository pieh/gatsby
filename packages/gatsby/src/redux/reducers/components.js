const normalize = require(`normalize-path`)
const { interpret } = require(`xstate`)

const componentMachine = require(`../machines/page-component`)

const services = new Map()
let programStatus = `BOOTSTRAPPING`

module.exports = (state = new Map(), action) => {
  switch (action.type) {
    case `DELETE_CACHE`:
      return new Map()
    case `SET_PROGRAM_STATUS`:
      programStatus = action.payload
      if (programStatus === `BOOTSTRAP_QUERY_RUNNING_FINISHED`) {
        services.forEach(s => s.send(`BOOTSTRAP_FINISHED`))
      }
      return state
    case `CREATE_PAGE`: {
      action.payload.componentPath = normalize(action.payload.component)
      // Create XState service.
      let service
      if (!services.has(action.payload.componentPath)) {
        const machine = componentMachine.withContext({
          componentPath: action.payload.componentPath,
          query: state.get(action.payload.componentPath)?.query || ``,
          pages: [action.payload.path],
          isInBootstrap: programStatus === `BOOTSTRAPPING`,
        })
        service = interpret(machine).start()
        // .onTransition(nextState => {
        // console.log(
        // `component machine value`,
        // _.pick(nextState, [`value`, `context`, `event`])
        // )
        // })
        // .start()
        services.set(action.payload.componentPath, service)
      } else {
        service = services.get(action.payload.componentPath)
        if (!service.state.context.pages.includes(action.payload.path)) {
          service.send({ type: `NEW_PAGE_CREATED`, path: action.payload.path })
        }
      }

      state.set(
        action.payload.componentPath,
        Object.assign(
          {
            query: ``,
          },
          service.state.context
        )
      )
      return state
    }
    case `QUERY_EXTRACTED`: {
      action.payload.componentPath = normalize(action.payload.componentPath)
      const service = services.get(action.payload.componentPath)

      // Check if the query has changed or not.
      if (service.state.context.query === action.payload.query) {
        service.send(`QUERY_DID_NOT_CHANGE`)
      } else {
        service.send({
          type: `QUERY_CHANGED`,
          query: action.payload.query,
        })
      }

      state.set(action.payload.componentPath, {
        ...service.state.context,
      })
      return state
    }
    case `PAGE_COMPONENT_CHANGED`:
    case `QUERY_EXTRACTION_BABEL_ERROR`:
    case `QUERY_EXTRACTION_GRAPHQL_ERROR`: {
      action.payload.componentPath = normalize(action.payload.componentPath)
      const service = services.get(action.payload.componentPath)
      if (service) {
        service.send({
          type: action.type,
          ...action.payload,
        })
      }
      return state
    }
    case `REMOVE_TEMPLATE_COMPONENT`: {
      action.payload.componentPath = normalize(action.payload.componentPath)
      state.delete(action.payload.componentPath)
      return state
    }
    case `DELETE_PAGE`: {
      const service = services.get(normalize(action.payload.component))
      service.send({
        type: `DELETE_PAGE`,
        page: action.payload,
      })
      return state
    }
  }

  return state
}
