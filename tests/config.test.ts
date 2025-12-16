import { describe, expect, test } from 'vitest';
import { validateConfig } from '../cli/config';

describe('validateConfig', () => {
  test('returns defaults for empty config', () => {
    const config = validateConfig({});

    expect(config.entry).toBe('./index.testify.js');
    expect(config.registry).toBe('./testify/registry.tsx');
    expect(config.baselines).toBe('./testify/baselines');
    expect(config.threshold).toBe(0.01);
    expect(config.port).toBe(8089);
    expect(config.defaultWaitMs).toBe(500);
    expect(config.retryCount).toBe(2);
    expect(config.retryDelayMs).toBe(1000);
    expect(config.gitLfs).toBe(false);
  });

  test('returns ios defaults', () => {
    const config = validateConfig({});

    expect(config.ios.simulator).toBe('iPhone 15 Pro');
    expect(config.ios.scheme).toBeUndefined();
    expect(config.ios.workspace).toBeUndefined();
    expect(config.ios.viewport).toBeUndefined();
  });

  test('returns android defaults', () => {
    const config = validateConfig({});

    expect(config.android.emulator).toBe('Pixel_7_API_34');
    expect(config.android.packageName).toBeUndefined();
    expect(config.android.viewport).toBeUndefined();
  });

  test('returns statusBar defaults', () => {
    const config = validateConfig({});

    expect(config.statusBar.freeze).toBe(true);
  });

  test('allows disabling statusBar freeze', () => {
    const config = validateConfig({
      statusBar: { freeze: false },
    });

    expect(config.statusBar.freeze).toBe(false);
  });

  test('merges user config with defaults', () => {
    const config = validateConfig({
      threshold: 0.05,
      port: 9000,
      ios: {
        simulator: 'iPhone 14',
      },
    });

    expect(config.threshold).toBe(0.05);
    expect(config.port).toBe(9000);
    expect(config.ios.simulator).toBe('iPhone 14');
    expect(config.entry).toBe('./index.testify.js'); // default preserved
  });

  test('validates threshold range', () => {
    expect(() => validateConfig({ threshold: -0.1 })).toThrow();
    expect(() => validateConfig({ threshold: 1.5 })).toThrow();
    expect(() => validateConfig({ threshold: 0.5 })).not.toThrow();
  });

  test('validates port is positive integer', () => {
    expect(() => validateConfig({ port: -1 })).toThrow();
    expect(() => validateConfig({ port: 0 })).toThrow();
    expect(() => validateConfig({ port: 8080 })).not.toThrow();
  });

  test('validates viewport dimensions', () => {
    expect(() =>
      validateConfig({
        ios: { viewport: { width: -100, height: 800 } },
      }),
    ).toThrow();

    expect(() =>
      validateConfig({
        ios: { viewport: { width: 400, height: 800 } },
      }),
    ).not.toThrow();
  });

  test('validates retryCount is non-negative', () => {
    expect(() => validateConfig({ retryCount: -1 })).toThrow();
    expect(() => validateConfig({ retryCount: 0 })).not.toThrow();
    expect(() => validateConfig({ retryCount: 5 })).not.toThrow();
  });
});
