import { chmod } from 'node:fs/promises';
import { build } from 'esbuild';

const sharedConfig = {
  bundle: true,
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  target: 'node20',
};

await Promise.all([
  build({
    ...sharedConfig,
    entryPoints: ['./src/index.ts', './src/config.ts'],
    outdir: './dist/src',
    external: ['react', 'react-native'],
  }),
  build({
    ...sharedConfig,
    entryPoints: ['./cli/index.ts'],
    outdir: './dist/cli',
    banner: { js: '#!/usr/bin/env node' },
  }),
]);
await chmod('./dist/cli/index.js', 0o755);
