import { defineConfig } from '@samsara-dev/react-native-testify/config';

export default defineConfig({
  entry: './index.testify.js',
  registry: './testify/registry.tsx',
  baselines: './testify/baselines',
  threshold: 0.01,
  defaultWaitMs: 300,
  retryCount: 0,

  ios: {
    simulator: process.env.TESTIFY_IOS_SIMULATOR_NAME || 'iPhone 15 Pro',
    bundleId: 'org.reactjs.native.example.TestifyExample',
  },
});

