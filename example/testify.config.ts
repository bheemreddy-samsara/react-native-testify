import {defineConfig} from '../cli/define-config';

export default defineConfig({
  entry: './index.testify.js',
  registry: './testify/registry.tsx',
  baselines: './testify/baselines',
  threshold: 0.01,
  defaultWaitMs: 300,
  retryCount: 2,

  ios: {
    simulator: 'iPhone 16 Pro',
    bundleId: 'org.reactjs.native.example.TestifyExample',
  },

  android: {
    emulator: 'Pixel_7_API_34',
  },
});
