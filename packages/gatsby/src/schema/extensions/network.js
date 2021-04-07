import fastq from "fastq"
import reporter from "gatsby-cli/lib/reporter"

const NETWORK_TASK_QUEUE_CONCURRENCY = 200

const networkTaskQueue = fastq(
  async ({ resolver, source, args, context, info }, cb) => {
    try {
      const result = await resolver(source, args, context, info)

      cb(null, result)
    } catch (e) {
      cb(e)
    }
  },
  NETWORK_TASK_QUEUE_CONCURRENCY
)

let progress
let total = 0
let current

export function queueNetworkTask(task) {
  return new Promise((resolve, reject) => {
    total++
    if (!progress) {
      progress = reporter.createProgress(`Running network tasks`, total)
      progress.start()
      current = 0
    } else {
      progress.total = total
    }

    networkTaskQueue.push(task, (err, result) => {
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
