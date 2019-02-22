const express = require(`express`)
const fs = require(`fs-extra`)
const path = require(`path`)
var multer = require(`multer`)

const queue = []

const inProgress = new Map()

// same signature as process file
exports.processFile = (file, transforms, options = {}) => {
  console.log(`process file`, file)

  const task = {
    file,
    transforms: transforms.map(t => {
      let outsideResolve
      const promise = new Promise(resolve => {
        outsideResolve = resolve
      })
      return {
        ...t,
        outsideResolve,
        promise,
      }
    }),
    options,
  }

  queue.push(task)

  return task.transforms.map(t => t.promise)
}

var upload = multer({ dest: require(`os`).tmpdir() })

const app = express()

app.get(`/get`, (req, res) => {
  console.log(`get `, req.query)
  res.sendFile(req.query.file)
  // res.send(`lol`)
})

app.get(`/`, (req, res) => {
  if (queue.length <= 0) {
    res.status(418)
    res.send()
    return
  }
  // const task = queue[0]
  const task = queue.pop()
  inProgress.set(task.file, task)

  const normalizedTask = {
    ...task,
    transforms: task.transforms.map(({ promise, outsideResolve, ...t }) => t),
  }
  // console.log(`got request`)

  const data = {
    task: normalizedTask,
  }

  res.setHeader(`Content-Type`, `application/json`)
  res.send(JSON.stringify(data))
})

app.post(`/`, upload.array(`files`), async (req, res) => {
  // await fs.move(
  //   req.file.path,
  //   path.join(process.cwd(), `results`, `${req.body.task}.txt`)
  // )

  console.log()
  console.log()

  const task = JSON.parse(req.body.task)
  console.log(`oh great - someone did work for me`, task.file)
  const taskData = inProgress.get(task.file)

  inProgress.delete(task.file)

  taskData.transforms.forEach(async (t, i) => {
    await fs.ensureDir(path.dirname(t.outputPath))
    // console.log(`moving`, {
    //   from: req.files[i].path,
    //   to: t.outputPath,
    // })
    await fs.move(req.files[i].path, t.outputPath)
    t.outsideResolve(t)
  })

  res.send()
})

const init = async () => {
  const port = 7999
  app.listen(port, () => {
    console.log(`Waiting for request on port ${port}`)
  })
}

init()
