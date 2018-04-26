const Queue = require(`better-queue`)
const Promise = require(`bluebird`)
const axios = require(`axios`)

const _defaults = {
  id: `url`,
}

/**
 * [handleQueue description]
 * @param  {[type]}   task [description]
 * @param  {Function} cb   [description]
 * @return {[type]}        [description]
 */
async function handleQueue(task, cb) {
  try {
    const response = await axios(task)
    cb(null, response)
  } catch (err) {
    cb(err)
  }
}

/**
 * Queue instance for handling concurent request
 */
let queue

/**
 * @typedef {Options}
 * @type {Object}
 * @see For a detailed descriptions of the options,
 *      see {@link https://www.npmjs.com/package/better-queue#full-documentation|better-queue on Github}
 */

/**
 * Initialize request queue
 *
 * @param  {Options}  opts   Options that will be given to better-queue
 */
exports.initQueue = opts => {
  queue = new Queue(handleQueue, { ..._defaults, ...opts })
}

/**
 * Manage running request with queue to limit maximum concurrent requests
 *
 * @param  {Object} task     Axios formatted request object
 * @return {Promise}         Resolves with the reponse of request
 */
const request = task =>
  new Promise((resolve, reject) => {
    if (!queue) {
      reject(`Queue not initialized`)
    }

    queue
      .push(task)
      .on(`finish`, function(result) {
        resolve(result)
      })
      .on(`failed`, function(err) {
        if (err.response.status === 404) {
          console.error(`Failed ${task.url}: ${err}`)
          resolve({ data: { data: [], links: {} } })
        } else {
          reject(err)
        }
      })
  })

exports.request = request
exports.get = url => request({ url, method: `get` })
