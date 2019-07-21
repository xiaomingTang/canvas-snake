const path = require("path")
const webpack = require("webpack")
const webpackMerge = require("webpack-merge")
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const commonConfig = require("./webpack.common.config.js")
const Paths = require("./paths.js")

const devConfig = {
  plugins: [
    new BundleAnalyzerPlugin({
      defaultSizes: "parsed"
    })
  ]
}

module.exports = webpackMerge(commonConfig, devConfig)
