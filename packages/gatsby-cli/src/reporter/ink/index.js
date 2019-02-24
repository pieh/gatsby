const importJsx = require(`import-jsx`)
const { render, h } = require(`ink`)

const { CLI, handler } = importJsx(`./cli`)
// const { createElement } = require(`react`)

const noOp = () => {}

exports.initInk = reporter => {
  // const oldActivityTimer = reporter.activityTimer

  // [`activityTimer`].forEach(field => {
  //   reporter[field] = (...args) => {

  //   }
  // })
  handler.console = { log: console.log }
  // console.log = noOp
  // console.error = noOp
  // console.warn = noOp

  // reporter.activityTimer = (name, activityArgs = {}) => {

  // }
  // console.log(`we are intercepting`)
  // oldActivityTimer(...args)

  handler.hijackReporter(reporter)
  render(h(CLI))
}
