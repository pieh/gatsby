var csv = require(`fast-csv`)
const fs = require(`fs`)

let stats = null
let file = null
let fields = null

module.exports = {
  setFile(_file) {
    stats = {}
    file = _file
    fields = []
  },
  setStat(name, time) {
    if (stats) {
      stats[name] = time
      fields.push(name)
    }
  },
  async save() {
    if (stats) {
      await new Promise((resolve, reject) => {
        const fullPath = `${process.cwd()}/${file}`
        const data = []

        const writeData = () => {
          data.push(stats)
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
    }
  },
}
