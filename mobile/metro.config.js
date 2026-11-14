const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// @orbit/shared is a plain TS package symlinked via "file:../shared"; Metro must watch it and resolve its deps from mobile/node_modules.
const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../shared');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
