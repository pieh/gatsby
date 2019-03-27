const depcheck = require(`depcheck`)
const { getPackages } = require(`@lerna/project`)

// detect "require(`template-literal`)"
// this is copied from depcheck code
// it's just not released yet - so we can remove this later
// https://github.com/depcheck/depcheck/blob/6a8d6bacc7d189ab6d2b6b207a35c36c998d3f32/src/detector/requireCallExpression.js
const TemplateLiteralDetector = function requireCallExpression(node) {
  if (
    node.type === `CallExpression` &&
    node.callee &&
    node.callee.type === `Identifier` &&
    node.callee.name === `require` &&
    node.arguments.length === 1
  ) {
    if (
      node.arguments[0].type === `Literal` ||
      node.arguments[0].type === `StringLiteral`
    ) {
      return typeof node.arguments[0].value === `string`
        ? [node.arguments[0].value]
        : []
    }

    if (
      node.arguments[0].type === `TemplateLiteral` &&
      node.arguments[0].quasis.length === 1 &&
      node.arguments[0].expressions.length === 0
    ) {
      return [node.arguments[0].quasis[0].value.raw]
    }
  }
  return []
}

const options = {
  ignoreDirs: [`__testfixtures__`, `__tests__`],
  withoutDev: true,
  parsers: {
    "*.js": depcheck.parser.jsx,
    "*.jsx": depcheck.parser.jsx,
  },
  detectors: [
    depcheck.detector.requireCallExpression,
    depcheck.detector.requireResolveCallExpression,
    depcheck.detector.importDeclaration,
    depcheck.detector.exportNamedDeclaration,
    depcheck.detector.gruntLoadTaskCallExpression,
    TemplateLiteralDetector,
  ],
}

getPackages(process.cwd()).then(async packages => {
  const results = await Promise.all(
    packages.map(
      pkg =>
        new Promise(resolve => {
          depcheck(pkg.location, options, unused => {
            const result = {
              pkg,
              used: unused.using,
              notUsed: unused.dependencies,
              missing: unused.missing,
            }
            resolve(result)
          })
        })
    )
  )

  // once everything is done we can output things to console
  // (promise.all was doing things concurrently - so this
  // make sure output is not mangled)

  let exitCode = 0
  results.forEach(({ pkg, missing, notUsed }) => {
    const anythingNotUsed = notUsed && notUsed.length > 0
    const anythingMissing = missing && Object.keys(missing).length > 0
    if (anythingMissing || anythingNotUsed) {
      console.log(pkg.name)
      if (anythingMissing) {
        exitCode = 1
        console.log(`  Missing deps:`)
        Object.keys(missing).forEach(missingPackage => {
          console.log(`    - ${missingPackage}`)
          missing[missingPackage].forEach(file => {
            console.log(`      - ${file}`)
          })
        })
      }
      if (anythingNotUsed) {
        console.log(`  Unused deps:`)
        notUsed.forEach(unusedPackage => {
          console.log(`    - ${unusedPackage}`)
        })
      }
    }
  })

  process.exit(exitCode)
})
