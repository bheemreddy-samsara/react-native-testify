import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import { getRegistryRelativeImportPath } from '../cli/commands/discover';

describe('getRegistryRelativeImportPath', () => {
  function createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'testify-discover-cmd-'));
  }

  function cleanup(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  test('prints a registry-relative import for the default layout', () => {
    const tmpDir = createTempDir();
    try {
      const registryPath = path.join(tmpDir, 'testify/registry.tsx');
      const generatedRegistryPath = path.join(
        tmpDir,
        'testify/.generated-registry.tsx',
      );

      expect(
        getRegistryRelativeImportPath({ registryPath, generatedRegistryPath }),
      ).toBe('./.generated-registry');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('prints a nested import path when generated registry is in a subdirectory', () => {
    const tmpDir = createTempDir();
    try {
      const registryPath = path.join(tmpDir, 'testify/registry.tsx');
      const generatedRegistryPath = path.join(
        tmpDir,
        'testify/generated/.generated-registry.tsx',
      );

      expect(
        getRegistryRelativeImportPath({ registryPath, generatedRegistryPath }),
      ).toBe('./generated/.generated-registry');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('prints a parent relative import path when generated registry is outside the registry directory', () => {
    const tmpDir = createTempDir();
    try {
      const registryPath = path.join(tmpDir, 'src/testify/registry.tsx');
      const generatedRegistryPath = path.join(
        tmpDir,
        'testify/.generated-registry.tsx',
      );

      expect(
        getRegistryRelativeImportPath({ registryPath, generatedRegistryPath }),
      ).toBe('../../testify/.generated-registry');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('strips a .ts extension from the generated registry import path', () => {
    const tmpDir = createTempDir();
    try {
      const registryPath = path.join(tmpDir, 'testify/registry.tsx');
      const generatedRegistryPath = path.join(
        tmpDir,
        'testify/.generated-registry.ts',
      );

      expect(
        getRegistryRelativeImportPath({ registryPath, generatedRegistryPath }),
      ).toBe('./.generated-registry');
    } finally {
      cleanup(tmpDir);
    }
  });
});
