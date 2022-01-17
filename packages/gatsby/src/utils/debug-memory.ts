import * as Inspector from "inspector"
import * as fs from "fs-extra"

// Trick found in https://stackoverflow.com/questions/56311832/how-to-find-a-particular-object-in-devtools-memory-snapshot-if-the-type-of-the-o/67566509#67566509
// This will allow us to "tag" objects so we can locate them easily in heap snapshots

const taggedItemsByType = new Map()

class TaggedItem {
  // @ts-ignore ref is not used, just for heap snapshot tracking
  private ref: any

  constructor(data) {
    // This ref helps us inspect what is retaining the original data
    this.ref = data
  }
}

type TaggedItemType = typeof TaggedItem
type ClassCreator = (classToExtend: TaggedItemType) => TaggedItemType

const nameToWrappers = new Map()

export function memoryTrackingFactory(
  constructorName: string,
  classCreator: ClassCreator
): <T>(data: T) => T {
  let wrapper = nameToWrappers.get(constructorName)
  if (wrapper) {
    return wrapper
  }

  const Class = classCreator(TaggedItem)

  let taggedItems = taggedItemsByType.get(constructorName)
  if (!taggedItems) {
    taggedItems = new WeakMap()
    taggedItemsByType.set(constructorName, taggedItems)
  }

  wrapper = function <T>(dataToTrack: T): T {
    if (
      dataToTrack &&
      typeof dataToTrack === `object` &&
      !taggedItems.has(dataToTrack)
    ) {
      const tag = new Class(dataToTrack)
      // @ts-ignore T / object
      taggedItems.set(dataToTrack, tag)
    }
    return dataToTrack
  }

  nameToWrappers.set(constructorName, wrapper)

  return wrapper
}

// Couldn't figure out how to dynamically create a class / constructor with dynamic name,
// so just doing class creation here as second param
// unfortunately this also mean we can't really have separate constructors for different
// node types as we have to declare all types ahead of time
export const memoryDecorationGatsbyNode = memoryTrackingFactory(
  `GatsbyNode`,
  Base => class GatsbyNode extends Base {}
)

export const memoryDecorationGatsbyPage = memoryTrackingFactory(
  `GatsbyPage`,
  Base => class GatsbyPage extends Base {}
)

if (!process.env.GATSBY_DEBUG_MEMORY_RUN_ID) {
  process.env.GATSBY_DEBUG_MEMORY_RUN_ID = Date.now().toString()
}

// https://nodejs.org/api/inspector.html#heap-profiler
const snapshotLabelsCounter = new Map()
export async function takeHeapSnapshot(label: string): Promise<void> {
  // let some microtasks etc run, in particular if we used any of taggedItem
  // in this tick, they are marked as used and won't be garbage collected
  // even if there are no strong references anymore
  // See `KeepDuringJob` in weakref spec
  // https://github.com/tc39/proposal-weakrefs/blob/99c96cfbaf919f8405d329e76df166e7aab34d7a/history/spec.md
  await new Promise(resolve => process.nextTick(resolve))

  return new Promise((resolve, reject) => {
    const session = new Inspector.Session()
    session.connect()

    let counter = snapshotLabelsCounter.get(label) ?? 1

    const dir = `public/.heap-snapshots/${process.env.GATSBY_DEBUG_MEMORY_RUN_ID}`

    const fname = `${dir}/${label}-${
      process.env.GATSBY_WORKER_ID
        ? `worker-${process.env.GATSBY_WORKER_ID}`
        : `main`
    }${counter < 2 ? `` : `-${counter}`}.heapsnapshot`

    fs.ensureDirSync(dir)
    const fd = fs.openSync(fname, `w`)

    counter++
    snapshotLabelsCounter.set(label, counter)

    session.on(`HeapProfiler.addHeapSnapshotChunk`, m => {
      fs.writeSync(fd, m.params.chunk)
    })

    session.post(`HeapProfiler.takeHeapSnapshot`, undefined, err => {
      fs.closeSync(fd)

      session.disconnect()

      if (err) {
        return reject(err)
      }

      console.log(`takeHeapSnapshot "${fname}" done`)
      return resolve()
    })
  })
}
