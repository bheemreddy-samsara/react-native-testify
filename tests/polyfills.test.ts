import { describe, expect, test } from 'vitest';
import { generatePolyfillCode, resolvePolyfills } from '../cli/polyfills';

describe('resolvePolyfills', () => {
  test('returns all false when config is undefined', () => {
    const result = resolvePolyfills(undefined);
    expect(result).toEqual({ buffer: false, crypto: false, process: false });
  });

  test('returns explicit config values', () => {
    const result = resolvePolyfills({
      buffer: true,
      crypto: false,
      process: true,
    });
    expect(result).toEqual({ buffer: true, crypto: false, process: true });
  });

  test('defaults missing values to false', () => {
    const result = resolvePolyfills({ buffer: true });
    expect(result).toEqual({ buffer: true, crypto: false, process: false });
  });
});

describe('generatePolyfillCode', () => {
  test('returns empty string when no polyfills enabled', () => {
    const code = generatePolyfillCode({
      buffer: false,
      crypto: false,
      process: false,
    });
    expect(code).toBe('');
  });

  test('generates buffer polyfill code', () => {
    const code = generatePolyfillCode({
      buffer: true,
      crypto: false,
      process: false,
    });
    expect(code).toContain("import { Buffer } from 'buffer'");
    expect(code).toContain('globalThis.Buffer = Buffer');
  });

  test('generates process polyfill code', () => {
    const code = generatePolyfillCode({
      buffer: false,
      crypto: false,
      process: true,
    });
    expect(code).toContain("import process from 'process'");
    expect(code).toContain('globalThis.process = process');
  });

  test('generates crypto polyfill code', () => {
    const code = generatePolyfillCode({
      buffer: false,
      crypto: true,
      process: false,
    });
    expect(code).toContain("import crypto from 'crypto-browserify'");
    expect(code).toContain('globalThis.crypto = crypto');
  });

  test('generates all polyfills when all enabled', () => {
    const code = generatePolyfillCode({
      buffer: true,
      crypto: true,
      process: true,
    });
    expect(code).toContain('Buffer');
    expect(code).toContain('process');
    expect(code).toContain('crypto');
  });
});
