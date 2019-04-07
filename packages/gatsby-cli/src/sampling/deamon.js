const signalExit = require(`signal-exit`)
const pidusage = require(`pidusage`)
const fs = require(`fs-extra`)
const os = require(`os`)
const path = require(`path`)

const projectPath = path.relative(os.homedir(), process.cwd())
const projectName = Buffer.from(projectPath)
  .toString(`base64`)
  .replace(/=/g, `_`)

const timestamp = new Date().getTime()

const outputPath = path.join(os.homedir(), `.gatsby`, `samples`, projectName)
fs.ensureDirSync(outputPath)

const samplesStream = fs.createWriteStream(
  path.join(outputPath, `${timestamp.toString()}.csv`),
  {
    flags: `w`,
  }
)

samplesStream.write(`timestamp,cpu,memory,activity\n`)

console.log(process.pid, process.ppid)

let activeActivities = []

process.on(`message`, message => {
  if (message.type === `startActivity`) {
    activeActivities.push(message.activity)
    getSample()
  } else if (message.type === `endActivity`) {
    activeActivities = activeActivities.filter(
      name => name !== message.activity
    )
    getSample()
  } else if (message.type === `exit`) {
    exit()
  }

  console.log(`message from parent:`, message)
})

signalExit(() => {
  exit()
})

const exit = () => {
  console.log(`exitting`)
  clearInterval(interval)
  samplesStream.close()
  process.exit()
}

let startTimestamp = null

let potentiallyDead = 0
const deadMemoryThreshold = 40 * 1024 * 1024
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

    samplesStream.write(
      `${sample.elapsed},${sample.cpu},${stats.memory},${activeActivities.join(
        `|`
      )}\n`
    )

    if (stats.memory < deadMemoryThreshold) {
      potentiallyDead++
      if (potentiallyDead > 15) {
        exit()
      }
    } else {
      potentiallyDead = 0
    }
  })
}

getSample()
const interval = setInterval(getSample, 250)
