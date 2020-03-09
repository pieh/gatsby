const path = require(`path`)
const webpack = require(`webpack`)

console.log(
  path.join(
    __dirname,
    `..`,
    `..`,
    `..`,
    `..`,
    `lib`,
    `reporter`,
    `loggers`,
    `ink`
  )
)

const mode = `production`
module.exports = {
  entry: path.join(__dirname, `index.js`),
  externals: {
    lodash: `commonjs2 lodash`,
  },
  mode,
  output: {
    path: path.join(
      __dirname,
      `..`,
      `..`,
      `..`,
      `..`,
      `lib`,
      `reporter`,
      `loggers`,
      `ink`
    ),
    filename: `./bundled-ink.js`,
  },
  devtool: false,
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: `babel-loader`,
          options: {
            presets: [`gatsby-package`],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(mode),
    }),
  ],
  stats: {
    warnings: false,
  },
  target: `node`,
}
