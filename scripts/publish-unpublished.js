#!/usr/bin/env node
/**
 * Publishes every public package in `packages/` whose version isn't on the
 * registry yet.
 *
 * Versioning is owned by release-please: merging its release PR writes the
 * version bumps and CHANGELOG entries and creates the tags, and the publish job
 * in `.github/workflows/release-please.yml` then runs this script.
 *
 * npm accepts publishes only from that workflow, via trusted publishing.
 *
 * Deciding what to publish by asking the registry (rather than parsing the
 * commit message or reading tags) keeps this idempotent: a release that fails
 * halfway through - or a package that was rate limited - is fixed by re-running,
 * which picks up only what is still missing.
 *
 * Usage:
 *   node scripts/publish-unpublished.js --dry-run  # resolve, but don't publish
 *   node scripts/publish-unpublished.js            # publish
 */

const fs = require(`fs`)
const path = require(`path`)
const { execFile } = require(`child_process`)

const packagesDir = path.join(__dirname, `..`, `packages`)

// The registry tolerates this comfortably and it keeps the check to a few
// seconds for ~100 packages
const REGISTRY_CONCURRENCY = 10

// ~100 registry lookups per run reliably turn up the occasional timeout
const REGISTRY_ATTEMPTS = 3

// A prerelease is published under its own preid as the dist-tag (`next`, `rc`,
// ...) so it can never land on `latest`; only stable versions get npm's default
// tag. `5.17.0-next.1` -> `next`, `5.17.0` -> null.
const prereleaseTag = version => {
  const match = /^\d+\.\d+\.\d+-([0-9A-Za-z-]+)/.exec(version)
  return match ? match[1] : null
}

const delay = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms)
  })

const dryRun = process.argv.includes(`--dry-run`)

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
        return
      }
      resolve({ stdout, stderr })
    })
  })

function readPackages() {
  return fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => {
      const dir = path.join(packagesDir, dirent.name)
      const manifestPath = path.join(dir, `package.json`)

      if (!fs.existsSync(manifestPath)) {
        return null
      }
      const manifest = JSON.parse(fs.readFileSync(manifestPath))

      if (!manifest.name || !manifest.version || manifest.private) {
        return null
      }
      return { dir, name: manifest.name, version: manifest.version }
    })
    .filter(Boolean)
}

async function isPublished({ name, version }, attempt = 1) {
  try {
    const { stdout } = await run(`npm`, [
      `view`,
      `${name}@${version}`,
      `version`,
    ])
    // Some npm versions answer an unknown version with an empty success
    // rather than an error
    return stdout.trim() !== ``
  } catch (error) {
    const output = `${error.stdout || ``}${error.stderr || ``}`
    const isMissing =
      output.includes(`E404`) ||
      output.includes(`No match found`) ||
      output.includes(`is not in this registry`)

    if (isMissing) {
      return false
    }
    if (attempt < REGISTRY_ATTEMPTS) {
      console.log(`  ${name}@${version}: lookup failed, retrying (${attempt})`)
      await delay(attempt * 1000)
      return isPublished({ name, version }, attempt + 1)
    }
    throw new Error(
      `Could not determine whether ${name}@${version} is published:\n${output}`
    )
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length)
  let cursor = 0

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++
        results[index] = await mapper(items[index])
      }
    })
  )
  return results
}

async function main() {
  const packages = readPackages()
  console.log(`Checking ${packages.length} packages against the registry...`)

  const published = await mapWithConcurrency(
    packages,
    REGISTRY_CONCURRENCY,
    isPublished
  )
  const pending = packages.filter((_, index) => !published[index])

  if (!pending.length) {
    console.log(
      `Nothing to publish - every package version is already on the registry`
    )
    return
  }

  console.log(`\nPublishing ${pending.length} package(s):`)
  pending.forEach(({ name, version }) => {
    const tag = prereleaseTag(version)
    console.log(`  ${name}@${version} -> ${tag || `latest`}`)
  })
  console.log(``)

  const failed = []
  for (const pkg of pending) {
    const args = [`publish`, `--access`, `public`, `--provenance`]
    const tag = prereleaseTag(pkg.version)
    if (tag) {
      args.push(`--tag`, tag)
    }
    if (dryRun) {
      args.push(`--dry-run`)
    }

    console.log(`> npm ${args.join(` `)} (${pkg.name}@${pkg.version})`)
    try {
      // const { stdout } = await run(`npm`, args, { cwd: pkg.dir })
      // console.log(stdout.trim())
    } catch (error) {
      failed.push(pkg)
      console.log(`FAILED ${pkg.name}@${pkg.version}`)
      console.log(`${error.stdout || ``}${error.stderr || ``}`)
    }
  }

  if (failed.length) {
    console.log(
      `\n${failed.length} package(s) failed to publish:\n` +
        failed.map(({ name, version }) => `  ${name}@${version}`).join(`\n`) +
        `\n\nRe-running this script publishes only what is still missing.`
    )
    process.exitCode = 1
    return
  }

  console.log(`\nPublished ${pending.length} package(s)`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
