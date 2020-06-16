const { emitter } = require(`../redux`)
const apiRunnerNode = require(`../utils/api-runner-node`)
import { createPages } from "../utils/create-pages"
import { createPagesLock } from "../utils/develop-lock"

let pagesDirty = false
let graphql

const runCreatePages = async () => {
  pagesDirty = false

  await createPages(graphql, `createPages`)

  emitter.emit(`CREATE_PAGE_END`)
}

module.exports = graphqlRunner => {
  graphql = graphqlRunner
  emitter.on(`CREATE_NODE`, action => {
    if (action.payload.internal.type !== `SitePage`) {
      createPagesLock.markAsPending(`CREATE_NODE - pagesDirty`)
      pagesDirty = true
    }
  })
  emitter.on(`DELETE_NODE`, action => {
    if (action.payload.internal.type !== `SitePage`) {
      pagesDirty = true
      createPagesLock.markAsPending(`DELETE_NODE - pagesDirty`)
      // Make a fake API call to trigger `API_RUNNING_QUEUE_EMPTY` being called.
      // We don't want to call runCreatePages here as there might be work in
      // progress. So this is a safe way to make sure runCreatePages gets called
      // at a safe time.
      apiRunnerNode(`FAKE_API_CALL`)
    }
  })

  emitter.on(`API_RUNNING_QUEUE_EMPTY`, async () => {
    if (pagesDirty) {
      createPagesLock.startRun()
      await runCreatePages()
      createPagesLock.endRun()
    }
  })
}
