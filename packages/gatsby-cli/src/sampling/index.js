const { join } = require(`path`)
const { fork } = require(`child_process`)
const signalExit = require(`signal-exit`)

let forked
exports.start = () => {
  // Gather CPU/Memory usage samples on background w/o blocking the main process

  forked = fork(join(__dirname, `deamon.js`), {
    stdio: [`inherit`, `inherit`, `inherit`, `ipc`],
    execArgv: [],
  })

  signalExit(() => {
    forked.send({
      type: `exit`,
    })
  })
}

exports.startActivity = activity => {
  if (forked) {
    forked.send({
      type: `startActivity`,
      activity,
    })
  }
}

exports.endActivity = activity => {
  if (forked) {
    forked.send({
      type: `endActivity`,
      activity,
    })
  }
}
