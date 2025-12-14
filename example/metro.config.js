const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const testifyRoot = path.resolve(__dirname, '..');
const exampleNodeModules = path.resolve(__dirname, 'node_modules');

const config = {
  watchFolders: [testifyRoot],
  resolver: {
    nodeModulesPaths: [exampleNodeModules],
    // Ensure react and react-native resolve from example's node_modules
    extraNodeModules: {
      'react': path.resolve(exampleNodeModules, 'react'),
      'react-native': path.resolve(exampleNodeModules, 'react-native'),
      'react-native-testify': testifyRoot,
    },
    // Block resolving from testify's node_modules for react packages
    blockList: [
      new RegExp(`${testifyRoot}/node_modules/react/.*`),
      new RegExp(`${testifyRoot}/node_modules/react-native/.*`),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
