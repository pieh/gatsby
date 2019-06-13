const path = require(`path`)
const HtmlWebpackPlugin = require(`html-webpack-plugin`)
const webpack = require(`webpack`)

const mode = `development`
module.exports = {
  entry: path.join(__dirname, `app.js`),
  mode,
  output: {
    path: path.join(__dirname, `..`, `..`),
    filename: `./app.js`,
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
            presets: [
              [
                `@babel/preset-env`,
                {
                  corejs: 2,
                  loose: true,
                  modules: `commonjs`,
                  useBuiltIns: `usage`,
                  targets: [`>0.25%`, `not dead`],
                },
              ],
              [
                `@babel/preset-react`,
                {
                  useBuiltIns: true,
                  pragma: `React.createElement`,
                  development: false,
                },
              ],
            ],
            plugins: [
              [
                `@babel/plugin-proposal-class-properties`,
                {
                  loose: true,
                },
              ],
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: [{ loader: `style-loader` }, { loader: `css-loader` }],
      },
    ],
  },
  resolve: {
    alias: {
      "codemirror-graphql": `/Users/misiek/dev/codemirror-graphql`,
      "graphql-language-service-interface": `/Users/misiek/dev/graphql-language-service/packages/interface/`,
      "graphql-language-service-utils": `/Users/misiek/dev/graphql-language-service/packages/utils`,
      "graphql-language-service-parser": `/Users/misiek/dev/graphql-language-service/packages/parser`,
      "graphql-language-service-types": `/Users/misiek/dev/graphql-language-service/packages/types`,
      "graphiql-explorer": `/Users/misiek/dev/graphiql-explorer`,
      "graphiql-code-exporter": `/Users/misiek/dev/graphiql-code-exporter`,
      graphql: path.dirname(require.resolve(`graphql/package.json`)),
      react$: path.dirname(require.resolve(`react/package.json`)),
      "react-dom": path.dirname(require.resolve(`react-dom/package.json`)),
      codemirror: path.dirname(require.resolve(`codemirror/package.json`)),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, `index.ejs`),
      filename: `index.html`,
      inject: false,
    }),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(mode),
    }),
  ],
  stats: {
    warnings: false,
  },
}
