import fastq from "fastq"
import reporter from "gatsby-cli/lib/reporter"

function createTaskTypeQueue(concurrency, label) {
  let progress
  let total = 0
  let current

  const taskQueue = fastq(async (fn, cb) => {
    try {
      const result = await fn()

      cb(null, result)
    } catch (e) {
      cb(e)
    }
  }, concurrency)

  return function (task) {
    return new Promise((resolve, reject) => {
      total++
      if (!progress) {
        progress = reporter.createProgress(label, total)
        progress.start()
        current = 0
      } else {
        progress.total = total
      }

      taskQueue.push(task, (err, result) => {
        progress.tick()
        current++
        if (current === total) {
          progress.end()
          progress = null
          total = 0
        }
        if (err) {
          reject(err)
          return
        }

        resolve(result)
      })
    })
  }
}

const queueNetworkTask = createTaskTypeQueue(
  process.env.GATSBY_EXPERIMENTAL_NETWORK_TASK_CONCURRENCY || 20,
  `Running network tasks`
)
const queueCPUTask = createTaskTypeQueue(
  process.env.GATSBY_EXPERIMENTAL_NETWORK_CPU_CONCURRENCY || 10,
  `Running CPU tasks`
)

export { queueNetworkTask, queueCPUTask }
