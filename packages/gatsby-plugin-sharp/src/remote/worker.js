const fetch = require(`node-fetch`)
const FormData = require(`form-data`)
const fs = require(`fs-extra`)
const url = `http://localhost:7999`
const os = require(`os`)
const path = require(`path`)

const processFile = require(`../process-file`)

const sleep = async (delay = 500) =>
  await new Promise(resolve => setTimeout(resolve, delay))

const doTheTask = async task => {
  const getURL = new URL(`/get`, url)
  getURL.searchParams.append(`file`, task.file)

  const inputPath = path.join(os.tmpdir(), task.file)
  console.log(`Downloading`, task.file, inputPath)

  const fileResponse = await fetch(getURL.href)

  await fs.ensureDir(path.dirname(inputPath))

  await new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(inputPath)
    fileResponse.body.pipe(fileStream)
    fileResponse.body.on(`error`, err => {
      reject(err)
    })
    fileStream.on(`finish`, function() {
      resolve()
    })
  })

  console.log(`Start processing`, task.file)
  const response = processFile(inputPath, task.transforms, task.options)

  await Promise.all(response)

  const form = new FormData()
  form.append(`task`, JSON.stringify(task))

  task.transforms.forEach((t, i) => {
    console.log(
      `Processed ${task.file} - ${t.args.width}x${t.args.height} - ${
        t.outputPath
      }`
    )
    form.append(`files`, fs.createReadStream(t.outputPath), {
      filepath: t.outputPath,
    })
  })
  return form
}

const getTask = async () => {
  try {
    const response = await fetch(url)

    try {
      if (response.status === 418) {
        await sleep()
        return
      }
      // console.log(`stat`, response.status, response.headers)
      const { task } = await response.json()

      task.transforms = await Promise.all(
        task.transforms.map(async t => {
          const outputPath = path.join(os.tmpdir(), t.outputPath)
          await fs.ensureDir(path.dirname(outputPath))
          return {
            ...t,
            outputPath,
          }
        })
      )

      // console.log(`I've got a job`, task)

      const result = await doTheTask(task)
      // await sleep(5000)

      // console.log(`I did the job`, task)

      await fetch(url, {
        method: `POST`,
        body: result,
        headers: result.getHeaders(),
      })
    } catch (e) {
      console.log(`error`, e)
    }
  } catch {
    await sleep()
  }
}

const init = async () => {
  console.log(`I'm worker and looking for a job`)
  // eslint-disable-next-line
  while (true) {
    await getTask()
  }
}

init()
