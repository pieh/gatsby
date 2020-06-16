// let isPendingStatus = false
// // const pendingLocks = new Set<string>()
// // const locks = new Map<string, number>()
// // let webpackResume: () => void

// export function isPending(): boolean {
//   return isPendingStatus
// }

// export function markAsPending(): void {
//   console.log("marked as pending")
//   // console.trace()
//   isPendingStatus = true
// }

// export function markAsDone(): void {
//   isPendingStatus = false
// }

// // export function pendingLock(lockName: string): void {
// //   pendingLocks.add(lockName)
// //   console.log(`pending lock "${lockName}"`)
// // }

// // export function consumePendingLock(lockName: string): void {
// //   pendingLocks.delete(lockName)
// //   maybeResumeWebpack()
// //   console.log(`consume pending lock "${lockName}"`)
// // }

// // export function lock(lockName: string): void {
// //   const lockCount = (locks.get(lockName) ?? 0) + 1

// //   console.log(`lock "${lockName}" = ${lockCount}`)
// //   locks.set(lockName, lockCount)
// // }

// // function maybeResumeWebpack(): void {
// //   console.log("maybe resume", {
// //     isLocked: isLocked(),
// //     isPending: isPending(),
// //     locks,
// //     pendingLocks,
// //   })
// //   if (!isLocked() && isPending()) {
// //     // we have no more locks - do something
// //     if (webpackResume) {
// //       console.log("resume webpack")
// //       webpackResume()
// //     }
// //   }
// // }

// // export function setResume(resume: () => void) {
// //   console.log("setResume", resume)
// //   webpackResume = resume
// // }

// // export function unlock(lockName: string): void {
// //   const lockCount = (locks.get(lockName) ?? 0) - 1

// //   console.log(`unlock "${lockName}" = ${lockCount}`)
// //   if (lockCount < 0) {
// //     throw new Error(
// //       `Well - that shouldn't happen. Lock count for "${lockName}" is ${lockCount}`
// //     )
// //   } else if (lockCount === 0) {
// //     locks.delete(lockName)
// //     maybeResumeWebpack()
// //   } else {
// //     locks.set(lockName, lockCount)
// //   }
// // }

// // export function isLocked(): boolean {
// //   return locks.size > 0 || pendingLocks.size > 0
// // }
