import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/config.ts'],
    outDir: 'dist/src',
    format: ['cjs', 'esm'],
    dts: true,
    external: ['react', 'react-native'],
  },
  {
    entry: ['cli/index.ts'],
    outDir: 'dist/cli',
    format: ['cjs'],
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
