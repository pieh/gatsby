const csv = require(`fast-csv`)
const fs = require(`fs`)
const stats = require(`stats-lite`)
const convertHrtime = require(`convert-hrtime`)

let times = null
let file = null
let cpuStart = null
let memorySamples = null
let intervals = null
let memoryValues = null
let cpuValues = null

const saveData = (type, row) =>
  new Promise((resolve, reject) => {
    const fullPath = `${process.cwd()}/${file}-${type}.csv`
    const data = []

    const writeData = () => {
      data.push(row)
      csv
        .writeToPath(fullPath, data, {
          headers: true,
        })
        .on(`finish`, function() {
          resolve()
        })
        .on(`error`, reject)
    }

    try {
      const previousData = fs.readFileSync(fullPath)
      csv
        .fromString(previousData, {
          headers: true,
        })
        .on(`data`, function(row) {
          data.push(row)
        })
        .on(`end`, writeData)
        .on(`error`, writeData)
    } catch (error) {
      writeData()
    }
  })

const generateStats = dataArray => {
  return {
    mean: stats.mean(dataArray),
    // median: stats.median(dataArray),
    // stdenv: stats.stdev(dataArray),
    // percentile90: stats.percentile(dataArray, 0.9),
    // min: Math.min.apply(Math, dataArray),
    max: Math.max.apply(Math, dataArray),
  }
}

const usageToTotalUsageMS = elapUsage => {
  var elapUserMS = elapUsage.user / 1000.0 // microseconds to milliseconds
  var elapSystMS = elapUsage.system / 1000.0
  return elapUserMS + elapSystMS
}

const stopSampling = name => {
  clearInterval(intervals[name])

  memoryValues[name] = generateStats(memorySamples[name])

  const elapTimeMS = convertHrtime(process.hrtime(cpuStart[name].hrtime))
    .milliseconds

  // if (elapTimeMS > 1000) {
  const elapUsageMS = usageToTotalUsageMS(
    process.cpuUsage(cpuStart[name].cpuUsage)
  )
  const cpuPercent = (elapUsageMS / elapTimeMS).toFixed(3)

  cpuValues[name] = cpuPercent
  // } else {
  //   // not reliable below 1s, dont add noise
  //   cpuValues[name] = 0
  // }

  delete cpuStart[name]
  delete memorySamples[name]
}

const normalizeMemoryStat = memory => memory / 1048576

module.exports = {
  setFile(_file) {
    times = {}
    file = _file
    cpuStart = {}
    memorySamples = {}
    intervals = {}
    memoryValues = {}
    cpuValues = {}
  },
  setTimeStat(name, time) {
    if (stats) {
      times[name] = time
      stopSampling(name)
    }
  },
  startSampling(name) {
    if (times) {
      cpuStart[name] = {
        hrtime: process.hrtime(),
        cpuUsage: process.cpuUsage(),
      }
      const localMemorySamples = (memorySamples[name] = [])
      localMemorySamples.push(normalizeMemoryStat(process.memoryUsage().rss))

      intervals[name] = setInterval(() => {
        localMemorySamples.push(normalizeMemoryStat(process.memoryUsage().rss))
      }, 50)
    }
  },

  save() {
    if (times) {
      // const memoryStatsNames =
      const memoryRow = {}
      ;[`max`, `mean`].forEach(statName => {
        Object.entries(memoryValues).forEach(([activityName, value]) => {
          memoryRow[`${statName}: ${activityName}`] = value[statName].toFixed(1)
        })
      })
      return Promise.all([
        saveData(`times`, times),
        saveData(`cpu`, cpuValues),
        saveData(`memory`, memoryRow),
      ])
      // await new Promise((resolve, reject) => {

      // })
    }

    return Promise.resolve()
  },
}
