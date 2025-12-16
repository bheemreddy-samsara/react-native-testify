import { describe, expect, test } from 'vitest';
import { resolveAliases, resolveImportPath } from '../cli/aliases';

describe('resolveAliases', () => {
  test('returns empty object when config is undefined', () => {
    const result = resolveAliases(undefined);
    expect(result).toEqual({});
  });

  test('returns explicit aliases', () => {
    const result = resolveAliases({
      '@components': './src/components',
      '@utils': './src/utils',
    });
    expect(result).toEqual({
      '@components': './src/components',
      '@utils': './src/utils',
    });
  });
});

describe('resolveImportPath', () => {
  const aliases = {
    '@components': '/project/src/components',
    '@utils': '/project/src/utils',
    '@': '/project/src',
  };

  test('resolves exact alias match', () => {
    const result = resolveImportPath('@components', aliases);
    expect(result).toBe('/project/src/components');
  });

  test('resolves alias with subpath', () => {
    const result = resolveImportPath('@components/Button', aliases);
    expect(result).toBe('/project/src/components/Button');
  });

  test('resolves single character alias', () => {
    const result = resolveImportPath('@/store', aliases);
    expect(result).toBe('/project/src/store');
  });

  test('returns original path when no alias matches', () => {
    const result = resolveImportPath('./local/path', aliases);
    expect(result).toBe('./local/path');
  });

  test('returns original path for relative imports', () => {
    const result = resolveImportPath('../parent/file', aliases);
    expect(result).toBe('../parent/file');
  });

  test('returns original path for node modules', () => {
    const result = resolveImportPath('react-native', aliases);
    expect(result).toBe('react-native');
  });
});
