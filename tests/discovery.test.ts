import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import { discoverTestifyFiles, generateRegistryCode } from '../cli/discovery';

describe('discoverTestifyFiles', () => {
  function createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'testify-discovery-'));
  }

  function createFile(dir: string, relativePath: string): void {
    const fullPath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, '// test file');
  }

  function cleanup(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  test('discovers *.testify.tsx files with default pattern', () => {
    const tmpDir = createTempDir();
    try {
      createFile(tmpDir, 'Button.testify.tsx');
      createFile(tmpDir, 'Card.testify.tsx');
      createFile(tmpDir, 'Other.tsx');

      const files = discoverTestifyFiles({ rootDir: tmpDir });

      expect(files.length).toBe(2);
      expect(files.map((f) => f.baseName).sort()).toEqual(['Button', 'Card']);
    } finally {
      cleanup(tmpDir);
    }
  });

  test('discovers files in nested directories', () => {
    const tmpDir = createTempDir();
    try {
      createFile(tmpDir, 'src/components/Button.testify.tsx');
      createFile(tmpDir, 'src/features/auth/Login.testify.tsx');

      const files = discoverTestifyFiles({ rootDir: tmpDir });

      expect(files.length).toBe(2);
      expect(files.map((f) => f.relativePath).sort()).toEqual([
        'src/components/Button.testify.tsx',
        'src/features/auth/Login.testify.tsx',
      ]);
    } finally {
      cleanup(tmpDir);
    }
  });

  test('respects scoped pattern src/**/*.testify.tsx', () => {
    const tmpDir = createTempDir();
    try {
      createFile(tmpDir, 'src/Button.testify.tsx');
      createFile(tmpDir, 'src/components/Card.testify.tsx');
      createFile(tmpDir, 'other/Badge.testify.tsx');
      createFile(tmpDir, 'Root.testify.tsx');

      const files = discoverTestifyFiles({
        rootDir: tmpDir,
        pattern: 'src/**/*.testify.tsx',
      });

      expect(files.length).toBe(2);
      expect(files.map((f) => f.relativePath).sort()).toEqual([
        'src/Button.testify.tsx',
        'src/components/Card.testify.tsx',
      ]);
    } finally {
      cleanup(tmpDir);
    }
  });

  test('respects pattern with specific directory', () => {
    const tmpDir = createTempDir();
    try {
      createFile(tmpDir, 'components/Button.testify.tsx');
      createFile(tmpDir, 'features/Card.testify.tsx');

      const files = discoverTestifyFiles({
        rootDir: tmpDir,
        pattern: 'components/*.testify.tsx',
      });

      expect(files.length).toBe(1);
      expect(files[0].relativePath).toBe('components/Button.testify.tsx');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('excludes configured directories', () => {
    const tmpDir = createTempDir();
    try {
      createFile(tmpDir, 'src/Button.testify.tsx');
      createFile(tmpDir, 'node_modules/pkg/Test.testify.tsx');
      createFile(tmpDir, 'dist/Button.testify.tsx');

      const files = discoverTestifyFiles({
        rootDir: tmpDir,
        exclude: ['node_modules', 'dist'],
      });

      expect(files.length).toBe(1);
      expect(files[0].relativePath).toBe('src/Button.testify.tsx');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('handles custom file extension pattern', () => {
    const tmpDir = createTempDir();
    try {
      createFile(tmpDir, 'Button.test.tsx');
      createFile(tmpDir, 'Card.test.tsx');
      createFile(tmpDir, 'Other.testify.tsx');

      const files = discoverTestifyFiles({
        rootDir: tmpDir,
        pattern: '**/*.test.tsx',
      });

      expect(files.length).toBe(2);
    } finally {
      cleanup(tmpDir);
    }
  });

  test('returns empty array when no matches', () => {
    const tmpDir = createTempDir();
    try {
      createFile(tmpDir, 'Button.tsx');
      createFile(tmpDir, 'Card.tsx');

      const files = discoverTestifyFiles({ rootDir: tmpDir });

      expect(files.length).toBe(0);
    } finally {
      cleanup(tmpDir);
    }
  });

  test('generateRegistryCode avoids import identifier collisions', () => {
    const tmpDir = createTempDir();
    try {
      createFile(tmpDir, 'src/a-b.testify.tsx');
      createFile(tmpDir, 'src/a_b.testify.tsx');

      const files = discoverTestifyFiles({ rootDir: tmpDir });
      const registryPath = path.join(tmpDir, 'testify/.generated-registry.tsx');
      const code = generateRegistryCode(files, registryPath);

      const importLines = code
        .split('\n')
        .filter((line) =>
          /^import\s+[a-zA-Z_][a-zA-Z0-9_]*\s+from\s+/.test(line),
        );

      const importNames = importLines.map((line) => {
        const match = line.match(
          /^import\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+from\s+/,
        );
        if (!match) {
          throw new Error(`Invalid import line: ${line}`);
        }
        return match[1];
      });

      expect(new Set(importNames).size).toBe(importNames.length);
    } finally {
      cleanup(tmpDir);
    }
  });

  test('generateRegistryCode prefixes identifiers that start with digits', () => {
    const tmpDir = createTempDir();
    try {
      createFile(tmpDir, '1-intro/Button.testify.tsx');

      const files = discoverTestifyFiles({ rootDir: tmpDir });
      const registryPath = path.join(tmpDir, 'testify/.generated-registry.tsx');
      const code = generateRegistryCode(files, registryPath);

      const importLines = code
        .split('\n')
        .filter((line) =>
          /^import\s+[a-zA-Z_][a-zA-Z0-9_]*\s+from\s+/.test(line),
        );

      for (const line of importLines) {
        expect(line).toMatch(/^import\s+[a-zA-Z_][a-zA-Z0-9_]*\s+from\s+/);
      }
    } finally {
      cleanup(tmpDir);
    }
  });
});
