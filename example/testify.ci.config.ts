import { defineConfig } from '@samsara-dev/react-native-testify/config';

export default defineConfig({
  entry: './index.testify.js',
  registry: './testify/.generated-registry.tsx',
  baselines: './testify/baselines',
  threshold: 0.01,
  defaultWaitMs: 300,
  retryCount: 0,

  ios: {
    simulator: process.env.TESTIFY_IOS_SIMULATOR_NAME || 'iPhone 15 Pro',
    bundleId: 'org.reactjs.native.example.TestifyExample',
  },

  android: {
    emulator: process.env.TESTIFY_ANDROID_EMULATOR_NAME || 'Pixel_8_API_35',
    viewport: { width: 1080, height: 2340 },
  },

  // Freeze status bar for consistent screenshots
  statusBar: {
    freeze: true,
  },

  // Idle detection for smarter wait behavior
  idleDetection: {
    enabled: true,
    timeoutMs: 5000,
    debounceMs: 100,
  },
});

