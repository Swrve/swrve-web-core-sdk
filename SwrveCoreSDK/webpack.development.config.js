const path = require("path");
module.exports = function (env) {
  env = env || {};
  return {
    mode: "development",
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
          ]
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
    },
  };
};
