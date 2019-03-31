const { join } = require(`path`)
const { fork } = require(`child_process`)
const signalExit = require(`signal-exit`)

let forked
exports.start = () => {
  // Gather CPU/Memory usage samples on background w/o blocking the main process

  // console.log(`me`, process.pid, process.ppid)
  forked = fork(join(__dirname, `deamon.js`), {
    stdio: [`inherit`, `inherit`, `inherit`, `ipc`],
    execArgv: [],
  })

  forked.on(`message`, message => {
    // console.log(`message from child:`, message)
    // forked.send(`Hi`)
  })

  signalExit(() => {
    forked.send({
      type: `exit`,
    })
    console.log(`signal exit`)
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
