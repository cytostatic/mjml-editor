//@ts-check

'use strict';

const webpack = require('webpack');
const CopyPlugin = require("copy-webpack-plugin");
const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const extensionConfig = (mode) => {
    /** @type WebpackConfig */
    return {
        target: 'node', // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
        mode: mode === 'production' ? 'production' : 'none',
    
        entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
        output: {
            // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
            path: path.resolve(__dirname, 'dist'),
            filename: 'extension.js',
            libraryTarget: 'commonjs2'
        },
        externals: {
            vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
            // modules added here also need to be added in the .vscodeignore file
        },
        resolve: {
            // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
            extensions: ['.ts', '.js']
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: 'ts-loader'
                        }
                    ]
                }
            ]
        },
        ...(mode !== 'production' && {
            devtool: 'nosources-source-map',
        }),
        infrastructureLogging: {
            level: "log", // enables logging required for problem matchers
        },
        plugins: [
            new webpack.ProgressPlugin(),
            new CopyPlugin({
                patterns: [
                    { from: "assets", to: "assets" },
                ],
            }),
        ]
    };
};

const reactConfig = (mode) => {
    /** @type WebpackConfig */
    return {
        entry: './src/editor/index.tsx',
        mode: 'production',
        ...(mode !== 'production' && {
            devtool: 'inline-source-map',
        }),
        output: {
            path: path.join(__dirname, '/dist'),
            filename: 'bundle.js'
        },
        devServer: {
            static: './dist',
        },
        module: {
            rules: [
                {
                    test: /\.css$/i,
                    use: ["style-loader", "css-loader"],
                },
                {
                    test: /\.(png|jpg|jpeg|gif)$/i,
                    type: "asset/resource",
                },
                {
                    test: /\.jsx?$/,
                    exclude: /node_modules/,
                    loader: 'babel-loader'
                },
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.svg$/,
                    use: [
                        {
                            loader: 'svg-url-loader',
                            options: {
                                limit: 10000,
                            },
                        },
                    ],
                },
            ]
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            fallback: {
                path: require.resolve("path-browserify")
            }
        },
        plugins: [
            new webpack.ProgressPlugin(),
            new webpack.ProvidePlugin({
                process: "process/browser"
            }),
        ]
    };
};

module.exports = (env, argv) => {
    return [extensionConfig(argv.mode), reactConfig(argv.mode)];
};