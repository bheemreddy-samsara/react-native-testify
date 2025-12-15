import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PolyfillsConfig } from './config';

export interface ResolvedPolyfills {
  buffer: boolean;
  crypto: boolean;
  process: boolean;
}

export function resolvePolyfills(
  config: PolyfillsConfig | undefined,
): ResolvedPolyfills {
  if (!config) {
    return { buffer: false, crypto: false, process: false };
  }

  if (config === 'auto') {
    return detectPolyfillsFromPackageJson();
  }

  return {
    buffer: config.buffer ?? false,
    crypto: config.crypto ?? false,
    process: config.process ?? false,
  };
}

function detectPolyfillsFromPackageJson(): ResolvedPolyfills {
  const result: ResolvedPolyfills = {
    buffer: false,
    crypto: false,
    process: false,
  };

  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return result;
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // Detect buffer usage
    if (allDeps.buffer || allDeps['buffer/']) {
      result.buffer = true;
    }

    // Detect crypto usage
    if (
      allDeps['crypto-browserify'] ||
      allDeps['react-native-crypto'] ||
      allDeps.crypto
    ) {
      result.crypto = true;
    }

    // Detect process usage
    if (allDeps.process) {
      result.process = true;
    }
  } catch {
    // Ignore errors reading package.json
  }

  return result;
}

export function generatePolyfillCode(polyfills: ResolvedPolyfills): string {
  const lines: string[] = [];

  if (polyfills.buffer) {
    lines.push("import { Buffer } from 'buffer';");
    lines.push('globalThis.Buffer = Buffer;');
  }

  if (polyfills.process) {
    lines.push("import process from 'process';");
    lines.push('globalThis.process = process;');
  }

  if (polyfills.crypto) {
    lines.push("import crypto from 'crypto-browserify';");
    lines.push('globalThis.crypto = crypto;');
  }

  return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}
