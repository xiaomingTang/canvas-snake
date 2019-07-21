const path = require("path")
const webpack = require("webpack")
const webpackMerge = require("webpack-merge")

const commonConfig = require("./webpack.common.config.js")
const Paths = require("./paths.js")

const devConfig = {
  devServer: {
    contentBase: Paths.Dist,
    // https: true,
    host: "0.0.0.0",
    port: 8080,
    useLocalIp: true,
    // publicPath: "/dist", // 此路径下的打包文件可在浏览器中访问
    hot: true,
    open: true
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ]
}

module.exports = webpackMerge(commonConfig, devConfig)
