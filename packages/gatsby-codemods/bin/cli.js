"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

exports.__esModule = true;
exports.runTransform = runTransform;
exports.run = run;
exports.jscodeshiftExecutable = exports.transformerDirectory = void 0;

var _path = _interopRequireDefault(require("path"));

var _execa = _interopRequireDefault(require("execa"));

const codemods = [`gatsby-plugin-image`, `global-graphql-calls`, `import-link`, `navigate-calls`, `rename-bound-action-creators`];

const transformerDirectory = _path.default.join(__dirname, '../', 'transforms');

exports.transformerDirectory = transformerDirectory;

const jscodeshiftExecutable = require.resolve('.bin/jscodeshift');

exports.jscodeshiftExecutable = jscodeshiftExecutable;

function runTransform(transform, targetDir) {
  const transformerPath = _path.default.join(transformerDirectory, `${transform}.js`);

  let args = [];
  args.push('--ignore-pattern=**/node_modules/**');
  args.push('--ignore-pattern=**/.cache/**');
  args.push('--ignore-pattern=**/public/**');
  args.push('--extensions=jsx,js,ts,tsx');
  args = args.concat(['--transform', transformerPath, targetDir]);
  console.log(`Executing command: jscodeshift ${args.join(' ')}`);

  const result = _execa.default.sync(jscodeshiftExecutable, args, {
    stdio: 'inherit',
    stripEof: false
  });

  if (result.error) {
    throw result.error;
  }
}

function run() {
  let [transform, targetDir] = process.argv.slice(2);

  if (!transform) {
    console.log(`Be sure to pass in the name of the codemod you're attempting to run.`);
    return;
  }

  if (!codemods.includes(transform)) {
    console.log(`You have passed in invalid codemod name: ${transform}. Please pass in one of the following: ${codemods.join(", ")}.`);
    return;
  }

  if (!targetDir) {
    console.log(`You have not provided a target directory to run the codemod against, will default to root.`);
    targetDir = `./`;
  }

  runTransform(transform, targetDir);
}