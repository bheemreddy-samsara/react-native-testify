import React from 'react';
import {AppRegistry, SafeAreaView, StyleSheet, LogBox} from 'react-native';
import {TestifyApp} from '@samsara-dev/react-native-testify';
import registry from './testify/.generated-registry';
import {ThemeProvider} from './src/context';
import {name as appName} from './app.json';

// Disable LogBox warnings during visual testing
LogBox.ignoreAllLogs(true);

// Providers to wrap all components
const providers = [{component: ThemeProvider, props: {}}];

// Optional wrapper for consistent styling (uses SafeAreaView to respect notch)
const wrapper = children => (
  <SafeAreaView style={styles.wrapper}>{children}</SafeAreaView>
);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

const App = () => (
  <TestifyApp registry={registry} providers={providers} wrapper={wrapper} />
);

AppRegistry.registerComponent(appName, () => App);
