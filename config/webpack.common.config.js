const path = require("path")
const webpack = require("webpack")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const tsImportPluginFactory = require('ts-import-plugin')
const autoprefixer = require("autoprefixer")

const Paths = require("./paths.js")
const Constants = require("./constants.js")

module.exports = {
  mode: Constants.isProduction ? "production" : "development",
  devtool: Constants.isProduction ? false : "source-map",
  entry: {
    index: path.join(Paths.Src, "index.tsx")
  },
  output: {
    path: Paths.dist,
    publicPath: "", // 此输出目录对应的公开 URL
    filename: "static/scripts/[name].[hash:6].js",
    chunkFilename: Constants.isProduction ? "static/scripts/chunk-[name].[chunkhash:6].js" : "static/scripts/chunk-[name].js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      "@Src": Paths.Src,
      "@ant-design/icons/lib/dist$": path.resolve(Paths.Src, "assets/icons/antd-icons.ts"),
    }
  },
  module: {
    rules: [
      {
        test: /\.glsl$/,
        loader: "raw-loader"
      },
      {
        test: /\.(js|jsx|ts|tsx)$/,
        include: Paths.Src,
        exclude: /node_modules/,
        enforce: "pre",
        use: [
          "source-map-loader",
          {
            loader: "eslint-loader",
            options: {
              formatter: require('eslint/lib/cli-engine/formatters/stylish'),
            },
          }
        ]
      },
      {
        test: /\.(js|jsx|ts|tsx)$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
          getCustomTransformers: _ => ({
            before: [tsImportPluginFactory({
              libraryDirectory: "es",
              libraryName: "antd",
              style: "css"
            })]
          }),
        }
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
        ]
      },
      {
        test: /\.s(a|c)ss$/,
        include: Paths.Src,
        exclude: /\.module\.s(a|c)ss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              plugins: [
                autoprefixer
              ]
            }
          },
          {
            loader: "sass-loader",
            options: {
              outputStyle: "expanded",
              sourceMap: !Constants.isProduction
            }
          }
        ]
      },
      {
        test: /\.module\.s(a|c)ss$/,
        include: Paths.Src,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: "typings-for-css-modules-loader",
            options: {
              modules: true,
              namedExport: true,
              camelCase: true,
              sass: true,
              minimize: true,
              localIdentName: "[local]_[hash:base64:5]"
            }
          },
          {
            loader: "postcss-loader",
            options: {
              plugins: [
                autoprefixer
              ]
            }
          },
          {
            loader: "sass-loader",
            options: {
              outputStyle: "expanded",
              sourceMap: !Constants.isProduction
            }
          }
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|ico)(\?.*)?$/i,
        use: [{
          loader: "url-loader",
          options: {
            limit: 8192,
            name: "static/images/[name].[hash:6].[ext]"
          }
        }]
      },
      {
        test: /\.(otf|eot|svg|ttf|woff)(\?.*)?$/i,
        use: [{
          loader: "url-loader",
          options: {
            limit: 8192,
            name: "static/fonts/[name].[hash:6].[ext]"
          }
        }]
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i,
        loader: 'url-loader',
        options: {
          limit: 8192,
          name: 'static/medias/[name].[hash:8].[ext]' // 文件名
        }
      },
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(Paths.Public, "index.html"),
      filename: "index.html",
      inject: "body",
      title: "react-demo",
      favicon: path.join(Paths.Public, "favicon.ico"),
      hash: true,
    }),
    new MiniCssExtractPlugin({
      filename: "static/styles/[name].[hash:6].css",
    }),
    new webpack.WatchIgnorePlugin([/css\.d\.ts$/]),
  ]
}