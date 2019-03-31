const signalExit = require(`signal-exit`)
const pidusage = require(`pidusage`)

console.log(process.pid, process.ppid)

const samples = []
const activities = {}
let lastElapsed = 0

const server = require(`http`).createServer()
const io = require(`socket.io`)(server)

io.on(`connection`, client => {
  client.send({
    samples,
    activities,
  })

  // client.on(`event`, data => {})
  // client.on(`disconnect`, () => {})
})
server.listen(3005)

process.on(`message`, message => {
  if (message.type === `startActivity`) {
    const activity = (activities[message.activity] = {
      start: lastElapsed,
      end: Number.POSITIVE_INFINITY,
    })
    io.send({
      activities: {
        [message.activity]: activity,
      },
    })
  } else if (message.type === `endActivity`) {
    const activity = (activities[message.activity].end = lastElapsed)
    io.send({
      activities: {
        [message.activity]: activity,
      },
    })
  } else if (message.type === `exit`) {
    process.exit()
  }

  console.log(`message from parent:`, message)
  // if (message === `exit`) {
  //   process.exit()
  // }
})

console.log(`lol wut`)
// process.exit()
signalExit(() => {
  // maybe dump stats to file
  console.log(`signal exit 2`)
})

let startTimestamp = null

const getSample = () => {
  pidusage(process.ppid, (err, stats) => {
    if (err) {
      console.log(`error`, err)
      return
    }

    if (!startTimestamp) {
      startTimestamp = stats.timestamp
    }

    const sample = {
      cpu: stats.cpu,
      memory: stats.memory,
      elapsed: (stats.timestamp - startTimestamp) / 1000.0,
    }

    // console.log(sample)

    io.send({
      samples: [sample],
    })

    samples.push(sample)
    lastElapsed = sample.elapsed

    // console.log(stats)
  })
}

getSample()
setInterval(getSample, 250)
