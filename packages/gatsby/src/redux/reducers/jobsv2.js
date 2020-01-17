const _ = require(`lodash`)
const objectSzeOf = require(`object-sizeof`)

const writeStats2 = (label, someMap) => {
  let total = 0
  someMap.forEach(v => {
    total += objectSzeOf(v)
  })
  console.log(` ${label} : ${total}`)
}

const writeStats = state => {
  console.log(`---------`)
  writeStats2(`complete  `, state.complete)
  writeStats2(`incomplete`, state.incomplete)
}

const debounceWriteStats = _.throttle(writeStats, 10000, { trailing: false })

console.log(`test ${objectSzeOf({ foo: `bar` })}`)

module.exports = (
  state = { incomplete: new Map(), complete: new Map() },
  action
) => {
  switch (action.type) {
    case `CREATE_JOB_V2`: {
      const { job, plugin } = action.payload

      state.incomplete.set(job.contentDigest, {
        job,
        plugin,
      })

      debounceWriteStats(state)

      return state
    }

    case `END_JOB_V2`: {
      const { job, result } = action.payload
      state.incomplete.delete(job.contentDigest)
      // inputPaths is used to make sure the job is still necessary
      state.complete.set(job.contentDigest, {
        result,
        inputPaths: job.inputPaths,
      })

      debounceWriteStats(state)

      return state
    }

    case `REMOVE_STALE_JOB_V2`: {
      const { contentDigest } = action.payload
      state.incomplete.delete(contentDigest)
      state.complete.delete(contentDigest)

      debounceWriteStats(state)

      return state
    }
  }

  return state
}
