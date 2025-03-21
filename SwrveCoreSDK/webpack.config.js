const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = function (env) {
  process.noDeprecation = true;
  env = env || {};
  return {
    mode: "production",
    entry: path.resolve(__dirname, "src/index.ts"),
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
              options: {
                compilerOptions: {
                  noEmit: false,
                  sourceMap: true,
                },
              },
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", "json"],
    },
    output: {
      filename: "SwrveCoreSDK.js",
      path: path.resolve(__dirname, "dist"),
      library: "SwrveCoreSDK",
      libraryTarget: "umd",
      globalObject: 'this',
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              pure_funcs: [
                "SwrveLogger.debug",
                "SwrveLogger.info",
                "SwrveLogger.warn",
              ],
            },
          },
        }),
      ],
    },
  };
};