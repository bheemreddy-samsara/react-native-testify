/**
 * @format
 */

// Toggle between normal app and testify harness
const USE_TESTIFY = true;

if (USE_TESTIFY) {
  require('./index.testify.js');
} else {
  const {AppRegistry} = require('react-native');
  const {default: App} = require('./App');
  const {name: appName} = require('./app.json');
  AppRegistry.registerComponent(appName, () => App);
}
