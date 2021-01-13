import { Span } from "opentracing"
import _ from "lodash"
import fs from "fs-extra"
import report from "gatsby-cli/lib/reporter"
import crypto from "crypto"
import { ExecutionResult, GraphQLError } from "graphql"

import path from "path"
import { store } from "../redux"
import { boundActionCreators } from "../redux/actions"
import { getCodeFrame } from "./graphql-errors"
import errorParser from "./error-parser"

import { GraphQLRunner } from "./graphql-runner"
import { IExecutionResult, PageContext } from "./types"
import { pageDataExists } from "../utils/page-data"
import { createContentDigest } from "gatsby-core-utils"

const resultHashes = new Map()

interface IQueryJob {
  id: string
  hash?: string
  query: string
  componentPath: string
  context: PageContext
  isPage: boolean
  pluginCreatorId: string
}

const orig = process.exit
process.exit = (...args) => {
  console.trace()
  orig.apply(process, args)
}

function reportLongRunningQueryJob(queryJob): void {
  const messageParts = [
    `Query takes too long:`,
    `File path: ${queryJob.componentPath}`,
  ]

  if (queryJob.isPage) {
    const { path, context } = queryJob.context
    messageParts.push(`URL path: ${path}`)

    if (!_.isEmpty(context)) {
      messageParts.push(`Context: ${JSON.stringify(context, null, 4)}`)
    }
  }

  report.warn(messageParts.join(`\n`))
}

function panicQueryJobError(
  queryJob: IQueryJob,
  errors: ReadonlyArray<GraphQLError>
): void {
  let urlPath = undefined
  let queryContext = {}
  const plugin = queryJob.pluginCreatorId || `none`

  if (queryJob.isPage) {
    urlPath = queryJob.context.path
    queryContext = queryJob.context.context
  }

  const structuredErrors = errors.map(e => {
    const structuredError = errorParser({
      message: e.message,
      filePath: undefined,
      location: undefined,
      error: e,
    })

    structuredError.context = {
      ...structuredError.context,
      codeFrame: getCodeFrame(
        queryJob.query,
        e.locations && e.locations[0].line,
        e.locations && e.locations[0].column
      ),
      filePath: queryJob.componentPath,
      ...(urlPath ? { urlPath } : {}),
      ...queryContext,
      plugin,
    }

    return structuredError
  })

  report.panicOnBuild(structuredErrors)
}

const queryChunkCache = new Map()

async function startQueryJob(
  graphqlRunner: GraphQLRunner,
  queryJob: IQueryJob,
  parentSpan: Span | undefined
): Promise<ExecutionResult> {
  let isPending = true

  // Print out warning when query takes too long
  const timeoutId = setTimeout(() => {
    if (isPending) {
      reportLongRunningQueryJob(queryJob)
    }
  }, 15000)

  return graphqlRunner
    .query(queryJob.query, queryJob.context, {
      parentSpan,
      queryName: queryJob.id,
    })
    .finally(() => {
      isPending = false
      clearTimeout(timeoutId)
    })
}

export async function queryRunner(
  graphqlRunner: GraphQLRunner,
  queryJob: IQueryJob,
  parentSpan: Span | undefined
): Promise<IExecutionResult> {
  const { program } = store.getState()

  // console.log(`run`, queryJob.id, queryJob.chunks)
  boundActionCreators.queryStart({
    path: queryJob.id,
    componentPath: queryJob.componentPath,
    isPage: queryJob.isPage,
  })

  // queryJob.chunks.forEach(chunk => {
  //   const usedVarsByThisQuery = Object.values(chunk.usedArguments).reduce(
  //     (acc, argName: string) => {
  //       acc[argName] = queryJob.context[argName]
  //       return acc
  //     },
  //     {}
  //   )

  //   const contentDigest = createContentDigest(usedVarsByThisQuery)

  //   let runCountsMap = chunk.runCount.get(contentDigest)
  //   if (!runCountsMap) {
  //     runCountsMap = {
  //       count: 0,
  //       usedVarsByThisQuery,
  //       contentDigest,
  //     }
  //     chunk.runCounts.set(contentDigest, runCountsMap)
  //   }

  //   runCountsMap.count++
  //   chunk.runCount++
  // })

  // Run query
  let result: IExecutionResult
  // Nothing to do if the query doesn't exist.
  if (!queryJob.query || queryJob.query === ``) {
    result = {}
  } else {
    const resultsToStitch = await Promise.all(
      queryJob.chunks.map(async usedByEntry => {
        const actuallyUsedParams = {}
        usedByEntry.usedArgumentLeafs.forEach(usedArgumentLeaf => {
          if (usedArgumentLeaf.type === `literal`) {
            actuallyUsedParams[usedArgumentLeaf.argPath] =
              usedArgumentLeaf.value
          } else if (usedArgumentLeaf.type === `variable`) {
            actuallyUsedParams[usedArgumentLeaf.argPath] =
              queryJob.context[usedArgumentLeaf.name]
          } else {
            console.log(`what type`, usedArgumentLeaf)
            // process.exit(1)
          }
        })

        const contentDigest = createContentDigest(actuallyUsedParams)
        const queryHash = usedByEntry.chunk.hash

        const queryRunHash = `${queryHash}/${contentDigest}`

        let runCountsMap = usedByEntry.chunk.runCounts[contentDigest]

        usedByEntry.chunk.runCount++

        if (!runCountsMap) {
          runCountsMap = {
            count: 1,
            realExecutions: 1,
            actuallyUsedParams,
            contentDigest,
          }

          usedByEntry.chunk.runCounts[contentDigest] = runCountsMap

          const tmpQueryJob = {
            ...queryJob,
            query: usedByEntry.chunk.queryChunkWithFragment,
          }

          const executionPromise = startQueryJob(
            graphqlRunner,
            tmpQueryJob,
            parentSpan
          )
          queryChunkCache.set(queryRunHash, executionPromise)
          return executionPromise.then(result => {
            return {
              ...result,
              selectionKind: usedByEntry.selectionKind,
              fieldName: usedByEntry.fieldName,
              alias: usedByEntry.alias,
            }
          })
        } else {
          runCountsMap.count++
          console.log(`reusing inflight or done query`, {
            query: usedByEntry.chunk.queryChunkWithFragment,
            actuallyUsedParams,
          })
          return queryChunkCache.get(queryRunHash).then(result => {
            return {
              ...result,
              selectionKind: usedByEntry.selectionKind,
              fieldName: usedByEntry.fieldName,
              alias: usedByEntry.alias,
            }
          })
        }
      })
    )

    result = resultsToStitch.reduce(
      (acc, resultToStitch) => {
        if (resultToStitch.selectionKind === `FragmentSpread`) {
          for (const [key, val] of Object.entries(resultToStitch.data)) {
            acc.data[key] = val
          }
        } else {
          acc.data[resultToStitch.alias] =
            resultToStitch.data[resultToStitch.fieldName]
        }
        acc.errors.push(...(resultToStitch.errors ?? []))
        return acc
      },
      { data: {}, errors: [] }
    )

    if (result.errors.length === 0) {
      delete result.errors
    }

    // if (resultsToStitch.length > 1) {
    //   debugger
    // }
    // result = await startQueryJob(graphqlRunner, queryJob, parentSpan)
    // result = { data: {}}
  }

  if (result.errors) {
    // If there's a graphql error then log the error and exit
    panicQueryJobError(queryJob, result.errors)
  }

  // Add the page context onto the results.
  if (queryJob && queryJob.isPage) {
    result[`pageContext`] = Object.assign({}, queryJob.context)
  }

  // Delete internal data from pageContext
  if (result.pageContext) {
    delete result.pageContext.path
    delete result.pageContext.internalComponentName
    delete result.pageContext.component
    delete result.pageContext.componentChunkName
    delete result.pageContext.updatedAt
    delete result.pageContext.pluginCreator___NODE
    delete result.pageContext.pluginCreatorId
    delete result.pageContext.componentPath
    delete result.pageContext.context
    delete result.pageContext.isCreatedByStatefulCreatePages
  }

  const resultJSON = JSON.stringify(result)
  const resultHash = crypto
    .createHash(`sha1`)
    .update(resultJSON)
    .digest(`base64`)

  if (
    resultHash !== resultHashes.get(queryJob.id) ||
    (queryJob.isPage &&
      !pageDataExists(path.join(program.directory, `public`), queryJob.id))
  ) {
    resultHashes.set(queryJob.id, resultHash)

    if (queryJob.isPage) {
      // We need to save this temporarily in cache because
      // this might be incomplete at the moment
      const resultPath = path.join(
        program.directory,
        `.cache`,
        `json`,
        `${queryJob.id.replace(/\//g, `_`)}.json`
      )
      await fs.outputFile(resultPath, resultJSON)
      store.dispatch({
        type: `ADD_PENDING_PAGE_DATA_WRITE`,
        payload: {
          path: queryJob.id,
        },
      })
    } else {
      const resultPath = path.join(
        program.directory,
        `public`,
        `page-data`,
        `sq`,
        `d`,
        `${queryJob.hash}.json`
      )
      await fs.outputFile(resultPath, resultJSON)
    }
  }

  // Broadcast that a page's query has run.
  boundActionCreators.pageQueryRun({
    path: queryJob.id,
    componentPath: queryJob.componentPath,
    isPage: queryJob.isPage,
  })

  // Sets pageData to the store, here for easier access to the resultHash
  if (
    process.env.GATSBY_EXPERIMENTAL_PAGE_BUILD_ON_DATA_CHANGES &&
    queryJob.isPage
  ) {
    boundActionCreators.setPageData({
      id: queryJob.id,
      resultHash,
    })
  }
  return result
}
