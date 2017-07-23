const webpack = require('webpack');
const path = require('path');

const buildPath = path.join(__dirname, './build');
const staticsPath = path.join(__dirname, './static');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = {
  context: path.resolve(__dirname, './src'),
  devtool: 'source-map',
  devServer: {
    historyApiFallback: true,
  },
  entry: {
    'app': [
      'babel-polyfill',
      './index.js'
    ]
  },
  output: {
    filename: '[name].bundle.js',
    path: buildPath,
    publicPath: '/'
  },
  plugins:
    [
     new HtmlWebpackPlugin({
        template: 'html/index.template.ejs',
        inject: 'body',
        alwaysWriteToDisk: true
      }),
      new HtmlWebpackHarddiskPlugin({
        outputPath: buildPath
      }),
      new CopyWebpackPlugin([{ from: staticsPath }]),
      new webpack.NoEmitOnErrorsPlugin(),
      new webpack.DefinePlugin({
        '__DEV__': true,
        'process.env': {
          'NODE_ENV': JSON.stringify('production')
        }
      })
    ],
  resolve: {
    extensions: ['.sol','.jsx', '.js']
  },
  module: {
    rules: [
      {
        test: /\.js(x)?$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader'
      },
      {
        test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)|\.svg($|\?)/,
        loader: 'url-loader'
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.(s)?css$/,
        loader: 'style-loader!css-loader?sourceMap!sass-loader?sourceMap'
      },
      {
        test: /\.(png|jpg)$/,
        loader: 'url-loader?limit=8192'
      }
    ]
  }
};
