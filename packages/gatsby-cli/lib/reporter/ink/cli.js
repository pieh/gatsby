const { h, Color, Text, Component, Fragment } = require(`ink`)
const Spinner = require(`ink-spinner`)
const tracer = require(`opentracing`).globalTracer()
const convertHrtime = require(`convert-hrtime`)

const methods = [
  `activityTimer`,
  `log`,
  `info`,
  `error`,
  `warn`,
  `panic`,
  `panicOnBuild`,
]

const handler = {
  hijackReporter(reporter) {
    methods.forEach(method => {
      reporter[method] = (...args) => handler.on(method, ...args)
    })
  },
}

class Activity extends Component {
  render() {
    const { active, name, status, elapsedTime } = this.props

    return (
      <div>
        {active ? <Spinner green /> : <Color green>success</Color>} {name}
        {elapsedTime ? ` - ${elapsedTime}` : ``}
        {status ? ` - ${status}` : ``}
      </div>
    )
  }
}

class Log extends Component {
  render() {
    const { type, content } = this.props

    let prefix = null
    if (type === `info`) {
      prefix = <Color blue>info </Color>
    } else if (type === `warn`) {
      prefix = <Color yellow>warning </Color>
    }

    return (
      <div>
        {prefix}
        {this.props.content.map(a => a.toString()).join(` `)}
      </div>
    )
  }
}

class ErrorLog extends Component {
  render() {
    const { message, error } = this.props
    return (
      <div>
        <Color red>error</Color> {message}
      </div>
    )
  }
}

const typeToComponent = {
  activity: Activity,
  log: Log,
  info: Log,
  warn: Log,
  error: ErrorLog,
}

class Item extends Component {
  render() {
    return h(typeToComponent[this.props.type], this.props)
  }
}

class CLI extends Component {
  constructor(props) {
    super(props)

    // this.state = {
    //   items: []
    // }
    this.items = []
    this.error = this.error.bind(this)
    this.panicOnBuild = this.panicOnBuild.bind(this)
    this.panic = this.panic.bind(this)
  }
  componentDidMount() {
    handler.on = (method, ...args) => this[method](...args)
  }

  getActivity(name, createIfNeeded = true) {
    let activity = this.items.find(
      item => item.type === `activity` && item.name === name
    )
    if (activity || !createIfNeeded) {
      return activity
    }

    activity = {
      type: `activity`,
      name,
      status: ``,
    }
    return activity
  }

  scheduleUpdate() {
    this.setState({
      beat: Date.now(),
    })
  }

  addItem(item) {
    this.items = [...this.items, item]

    this.scheduleUpdate()
  }

  setActivity(activity) {
    let stored = this.getActivity(activity.name, false)
    if (!stored) {
      this.addItem(activity)
    } else {
      this.scheduleUpdate()
      // this.setState(state => ({
      //   items: state.items

      // }))
    }
  }

  log(...args) {
    this.addItem({
      type: `log`,
      content: args,
    })
  }

  info(...args) {
    this.addItem({
      type: `info`,
      content: args,
    })
  }

  warn(...args) {
    this.addItem({
      type: `warn`,
      content: args,
    })
  }

  exit(code) {
    // this.setState({
    //   exitAfterUpdate: true,
    //   exitCode: code,
    // })
    // this.exitAfterUpdate = true
    // this.exitCode = code
    // this.scheduleUpdate()
  }

  componentDidUpdate() {
    if (this.state.exitAfterUpdate) {
      process.exit(this.state.exitCode)
    }
  }

  panic(...args) {
    this.error(...args)
    this.exit(1)
  }

  panicOnBuild(...args) {
    this.error(...args)
    if (process.env.gatsby_executing_command === `build`) {
      this.exit(1)
    }
  }

  error(message, error) {
    if (arguments.length === 1 && typeof message !== `string`) {
      error = message
      message = error.message
    }

    this.addItem({
      type: `error`,
      message,
      error,
    })
    // console.error(args)
  }

  activityTimer(name, activityArgs = {}) {
    let start = process.hrtime()
    const elapsedTime = () => {
      var elapsed = process.hrtime(start)
      return `${convertHrtime(elapsed)[`seconds`].toFixed(3)} s`
    }

    const { parentSpan } = activityArgs
    const spanArgs = parentSpan ? { childOf: parentSpan } : {}
    const span = tracer.startSpan(name, spanArgs)

    const updateActivity = update => {
      let activity = this.getActivity(name)
      update(activity)
      this.setActivity(activity)
    }

    return {
      start: () => {
        updateActivity(activity => (activity.active = true))
      },
      setStatus: s => {
        updateActivity(activity => (activity.status = s))
      },
      end: () => {
        updateActivity(activity => {
          activity.active = false
          activity.elapsedTime = elapsedTime()
        })
      },
      span,
    }
  }

  render() {
    // const { items } = this.state
    // return null
    return (
      <Fragment>
        <div>We are rendering with Ink</div>
        {this.items.map(item => (
          <Item {...item} />
        ))}
      </Fragment>
    )
  }
}

module.exports = {
  CLI,
  handler,
  methods,
}
