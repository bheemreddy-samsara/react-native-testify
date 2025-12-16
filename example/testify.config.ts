import { defineConfig } from '@samsara-dev/react-native-testify/config';

export default defineConfig({
  entry: './index.testify.js',
  registry: './testify/.generated-registry.tsx',
  baselines: './testify/baselines',
  threshold: 0.01,
  defaultWaitMs: 300,
  retryCount: 3,

  ios: {
    simulator: 'iPhone 16 Pro',
    bundleId: 'org.reactjs.native.example.TestifyExample',
  },

  android: {
    emulator: 'Pixel_8_API_35',
    // Match emulator display settings for consistent screenshots
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

  // Auto-discovery of .testify.tsx files
  discovery: {
    enabled: true,
    pattern: '**/*.testify.tsx',
    rootDir: './src',
    exclude: ['node_modules', 'dist', '.git'],
    generatedRegistry: './testify/.generated-registry.tsx',
  },
});
