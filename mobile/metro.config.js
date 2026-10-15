const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

// The money rules, the engine, the explanation and the chart maths live once, in ../src/domain, and the web app and
// this app both use them. Metro has to watch that folder, and find zod and Babel's helpers for it here, because a file outside this
// project cannot see this project's node_modules.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../src/domain')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  zod: path.resolve(__dirname, 'node_modules/zod'),
};

module.exports = config;
