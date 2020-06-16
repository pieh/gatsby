const chalk = require(`chalk`)

const locksLookup = new Map<string, RunningLock>()
const pendingRuns = new Map<
  string,
  {
    origin: RunningLock
    dependencies: string[]
    callback: Function
  }
>()

let lastStatus = ``

function log(...args: any[]): void {
  const extraLogs: any[] = []

  // status of services
  const newStatusBuilder: {
    [record: string]: "IDLE" | "PENDING" | "RUNNING"
  } = {}
  locksLookup.forEach(runningLock => {
    newStatusBuilder[runningLock.name] =
      runningLock.isRunning > 0
        ? `RUNNING`
        : runningLock.isPending
        ? `PENDING`
        : `IDLE`
  })

  const newStatus = JSON.stringify(newStatusBuilder)
    .replace(/RUNNING/g, chalk.green(`RUNNING`))
    .replace(/PENDING/g, chalk.yellow(`PENDING`))
    .replace(/IDLE/g, chalk.gray(`IDLE`))

  if (newStatus !== lastStatus) {
    extraLogs.push(chalk.cyan(`STATUS CHANGED`), newStatus)
    lastStatus = newStatus
  } else {
    extraLogs.push(chalk.gray(`NOTHING CHANGED`), newStatus)
  }

  // pending execution
  const pendingExecutions: string[] = []
  pendingRuns.forEach(pendingRun => {
    pendingExecutions.push(pendingRun.origin.name)
  })

  if (pendingExecutions.length > 0) {
    extraLogs.push(
      chalk.blueBright(`PENDING RUNS`),
      pendingExecutions.join(`, `)
    )
  } else {
    extraLogs.push(chalk.gray(`NO PENDING RUNS`))
  }

  console.log(chalk.magenta(`[lock]`), ...args, ...extraLogs)
}

class RunningLock {
  isPending = false
  isRunning = 0
  deps: string[]
  name: string

  constructor(name: string, deps: string[]) {
    this.deps = deps || []
    this.name = name
  }

  markAsPending(reason: string) {
    this.isPending = true
    log(
      `[${this.name}] ${chalk.yellow(`mark as pending`)} (reason: "${reason}")`
    )
  }

  startRun() {
    this.isPending = false
    this.isRunning++
    log(`[${this.name}] ${chalk.green(`start run`)}`)
  }

  endRun() {
    this.isRunning--

    log(`[${this.name}] ${chalk.red(`end run`)}`)
    // this.isPending = false

    if (this.isRunning === 0 && !this.isPending) {
      // if this service is no longer running - see if any pending dependant runs
      // were unblocked and run those
      pendingRuns.forEach((pendingRun, serviceName) => {
        const runningDeps = getRunningDeps(pendingRun.dependencies)

        if (runningDeps.size === 0) {
          log(
            `Delayed run "${serviceName}" (not blocked anymore by any of [${pendingRun.dependencies.join(
              `, `
            )}])`
          )

          pendingRuns.delete(serviceName)
          pendingRun.callback()
        }
      })
    }
  }

  // canRunRightNow(): boolean {
  //   const runningDeps = getRunningDeps(this.deps)
  //   return runningDeps.size === 0
  // }

  runOrEnqueue(
    arg: Function | { run: Function; enqueue: Function }
  ): Promise<void> {
    let run: Function, enqueue: Function

    if (typeof arg === `function`) {
      run = enqueue = arg
    } else if (typeof arg === `object` && arg.run && arg.enqueue) {
      run = arg.run
      enqueue = arg.enqueue
    } else {
      throw new Error(`Invalid runOrEnqueue argument: ${arg}`)
    }

    if (pendingRuns.has(this.name)) {
      log(
        `Discarding queued run for "${this.name}" because run is already pending`
      )
      return Promise.resolve()
    }

    const runningDeps = getRunningDeps(this.deps)

    if (runningDeps.size === 0) {
      log(
        `Run "${this.name}" (not blocked by any of [${this.deps.join(`, `)}])`
      )
      // console.trace()
      return Promise.resolve(run())
    } else {
      pendingRuns.set(this.name, {
        origin: this,
        dependencies: this.deps,
        callback: enqueue,
      })

      log(
        `Delay run for "${this.name}" because [${Array.from(runningDeps).join(
          `, `
        )}]`
      )
      return Promise.resolve()
    }
  }

  // isRunningOrPending(): boolean {
  //   return this.isPending || this.isRunning > 0 || areDepsRunning(this.deps)
  // }
}

const getRunningDeps = (
  dependencies: string[],
  collectedDeps: Set<string> = new Set()
): Set<string> => {
  if (dependencies.length === 0) {
    return collectedDeps
  }

  dependencies.forEach(depName => {
    const runningLock = locksLookup.get(depName)
    if (!runningLock) {
      return
    }

    if (runningLock.isPending || runningLock.isRunning > 0) {
      collectedDeps.add(runningLock.name)
    }

    getRunningDeps(runningLock.deps, collectedDeps)

    // const

    // return (
    //   runningLock.isPending ||
    //   runningLock.isRunning > 0 ||
    //   areDepsRunning(runningLock.deps)
    // )
    // return runningLock.isRunningOrPending()
  })

  return collectedDeps
}

// const areDepsRunning = (dependencies: string[]): boolean => {
//   if (dependencies.length === 0) {
//     return false
//   }

//   return dependencies.some(depName => {
//     const runningLock = locksLookup.get(depName)
//     if (!runningLock) {
//       return false
//     }

//     return (
//       runningLock.isPending ||
//       runningLock.isRunning > 0 ||
//       areDepsRunning(runningLock.deps)
//     )
//     // return runningLock.isRunningOrPending()
//   })
// }

// export function runWhenIdle(
//   dependencies: string[],
//   callback: () => void
// ): void {
//   if (!areDepsRunning(dependencies)) {
//     callback()
//   } else {
//     pendingRuns.add({
//       dependencies,
//       callback,
//     })
//   }
// }

/*export */ function getRunningLock(
  name: string,
  deps: string[] = []
): RunningLock {
  let runningLock = locksLookup.get(name)
  if (runningLock) {
    return runningLock
  }

  runningLock = new RunningLock(name, deps)
  locksLookup.set(name, runningLock)
  return runningLock
}

export const createPagesLock = getRunningLock(`create-pages`)
export const graphqlRunningLock = getRunningLock(`query-running`, [
  `create-pages`, // create-pages can create more queries to run (new pages)
])
export const requiresWriterLock = getRunningLock(`requires-writer`, [
  `query-running`, // query-running can add/remove modules
  `create-pages`, // create-pages can add/remove page templates
])
export const webpackLock = getRunningLock(`webpack-develop`, [
  `requires-writer`, // webpack bundle rely on requires-writer arteficats
])
export const pageDataFlushLock = getRunningLock(`page-data-flush`, [
  `webpack-develop`, // can change static queries for template
  `query-running`, // can produce new query result for page
])

// class DevelopLock {
//   isPending: boolean = false
//   hasPendingLock: boolean = false
//   locks: number = 0
//   callback?: () => void
//   name: string
//   waitFor: string[]

//   constructor(name: string, waitFor: string[]) {
//     this.name = name
//     this.waitFor = waitFor
//   }

//   pendingLock(): void {
//     this.hasPendingLock = true
//   }

//   consumePendingLock(): void {
//     this.hasPendingLock = false
//     this.maybeRun()
//   }

//   lock(): void {
//     this.locks++
//   }

//   unlock(): void {
//     this.locks--
//     if (this.locks < 0) {
//       throw new Error(
//         `Well - that shouldn't happen. Lock count for "${this.name}" is ${this.locks}`
//       )
//     } else if (this.locks === 0) {
//       this.maybeRun()
//     }
//   }

//   runWhenNotLocked(callback: () => void): void {
//     if (this.isLocked()) {
//       this.isPending = true
//       this.callback = callback
//     } else {
//       callback()
//     }
//   }

//   /**
//    * @private
//    */
//   maybeRun() {
//     if (this.isPending && this.callback && !this.isLocked()) {
//       this.callback()
//       this.isPending = false
//       this.callback = undefined
//     }
//   }

//   isLocked(): boolean {
//     return (
//       this.locks > 0 ||
//       this.hasPendingLock ||
//       this.waitFor.some(name => {
//         const dependentLock = locksLookup.get(name)
//         if (dependentLock) {
//           return dependentLock.isLocked()
//         }
//         return false
//       })
//     )
//   }
// }

// export function getLockObject(name: string, waitFor: string[]): DevelopLock {
//   const lockObject = new DevelopLock(name, waitFor)
//   locksLookup.set(name, lockObject)
//   return lockObject
// }
