#!/usr/bin/env node

// this is used for development purposes only
// to be able to run `gatsby build` once to source data
// and print schema and then just rebundle graphql-engine
// with source file changes and compare memory usage when
// running queries

import { createGraphqlEngineBundle } from "./bundle-webpack"
import reporter from "gatsby-cli/lib/reporter"
import { loadConfigAndPlugins } from "../../utils/worker/child/load-config-and-plugins"
import * as fs from "fs-extra"

async function run(): Promise<void> {
  // load config
  console.log(`loading config and plugins`)
  await loadConfigAndPlugins({
    siteDirectory: process.cwd(),
  })
  console.log(`clearing webpack cache`)

  try {
    // get rid of cache if it exist
    await fs.remove(process.cwd() + `/.cache/webpack/query-engine`)
  } catch (e) {
    // eslint-disable no-empty
  }

  console.log(`bundling`)
  // recompile
  await createGraphqlEngineBundle(process.cwd(), reporter, true)

  console.log(`DONE`)
}

run()
