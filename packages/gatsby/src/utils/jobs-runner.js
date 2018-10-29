const queue = require(`better-queue`)
const { store } = require(`../redux`)
const reporter = require(`gatsby-cli/lib/reporter`)
const debug = require(`debug`)(`gatsby:jobs-runner`)

// const args = {
//   reporter: require(`gatsby-cli/lib/reporter`),
// }

const q = new queue(
  async (task, cb) => {
    const handler = require(task.handler)
    debug(`Running job ${task.jobs.map(job => job.id).join(`, `)}`)
    try {
      await handler(task.jobs)
    } catch (e) {
      cb(e)
      return
    }

    task.jobs.forEach(job => {
      job.onFinish()
    })

    cb()
  },
  {
    merge: (oldTask, newTask, cb) => {
      // concat jobs arrays
      oldTask.jobs = oldTask.jobs.concat(newTask.jobs)
      return cb(null, oldTask)
    },
  }
)

exports.findJobGeneratingFile = (path, onFinish) => {
  const jobs = store.getState().jobs
  for (let job of jobs.active.values()) {
    if (job.outputPath === path) {
      const jobPromise = runJob(job)
      if (onFinish) {
        jobPromise.then(onFinish)
      }

      return job
    }
  }
  for (let job of jobs.queued.values()) {
    if (job.outputPath === path) {
      const jobPromise = runJob(job)
      if (onFinish) {
        jobPromise.then(onFinish)
      }

      return job
    }
  }
  return null
}

const runningJobs = new Map()

const runJob = job => {
  if (runningJobs.has(job.id)) {
    return runningJobs.get(job.id)
  }

  debug(`Queue job ${job.id}`)

  store.dispatch({
    type: `HANDLE_JOB`,
    payload: job,
  })

  const jobPromise = new Promise((resolve, reject) => {
    q.push({
      id: job.batchId,
      jobs: [
        {
          ...job,
          onFinish: function() {
            if (this.finished) {
              return
            }

            store.dispatch({
              type: `END_JOB`,
              payload: job,
            })

            runningJobs.delete(job.id)
            debug(`Resolving job ${job.id}`)
            this.finished = true
            resolve()
          },
          onError: function(msg, err) {
            if (this.finished) {
              return
            }

            store.dispatch({
              type: `END_JOB`,
              payload: job,
            })

            runningJobs.delete(job.id)
            this.finished = true
            reject(err)
            reporter.panicOnBuild(msg, err)
          },
          finished: false,
        },
      ],
      handler: job.handler,
    })
  })

  runningJobs.set(job.id, jobPromise)

  return jobPromise
}

// export.const
