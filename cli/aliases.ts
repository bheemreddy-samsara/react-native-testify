import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AliasesConfig } from './config';

export type ResolvedAliases = Record<string, string>;

export function resolveAliases(
  config: AliasesConfig | undefined,
): ResolvedAliases {
  if (!config) {
    return {};
  }

  if (config === 'auto') {
    return detectAliasesFromConfig();
  }

  return config;
}

function detectAliasesFromConfig(): ResolvedAliases {
  // Try tsconfig.json first
  const tsconfigAliases = readTsconfigAliases();
  if (Object.keys(tsconfigAliases).length > 0) {
    return tsconfigAliases;
  }

  // Try babel.config.js
  const babelAliases = readBabelAliases();
  if (Object.keys(babelAliases).length > 0) {
    return babelAliases;
  }

  return {};
}

function readTsconfigAliases(): ResolvedAliases {
  const result: ResolvedAliases = {};

  try {
    const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      return result;
    }

    const content = fs.readFileSync(tsconfigPath, 'utf-8');
    // Remove comments for JSON parsing
    const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    const tsconfig = JSON.parse(jsonContent);

    const paths = tsconfig.compilerOptions?.paths;
    const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';

    if (!paths) {
      return result;
    }

    for (const [alias, targets] of Object.entries(paths)) {
      if (!Array.isArray(targets) || targets.length === 0) continue;

      // Convert TypeScript path pattern to resolved path
      // e.g., "@components/*" -> ["./src/components/*"]
      const target = targets[0] as string;
      const aliasKey = alias.replace(/\/\*$/, '');
      const targetPath = target.replace(/\/\*$/, '');

      result[aliasKey] = path.resolve(process.cwd(), baseUrl, targetPath);
    }
  } catch {
    // Ignore errors reading tsconfig
  }

  return result;
}

function readBabelAliases(): ResolvedAliases {
  const result: ResolvedAliases = {};

  try {
    // Try babel.config.js
    const babelConfigPath = path.resolve(process.cwd(), 'babel.config.js');
    if (!fs.existsSync(babelConfigPath)) {
      return result;
    }

    // We can't easily require babel.config.js without babel itself
    // Just read the file and try to extract alias patterns
    const content = fs.readFileSync(babelConfigPath, 'utf-8');

    // Look for module-resolver plugin alias patterns
    const aliasMatch = content.match(/alias\s*:\s*\{([^}]+)\}/);
    if (aliasMatch) {
      // Very basic extraction - won't work for all cases
      const aliasBlock = aliasMatch[1];
      const entries = aliasBlock.matchAll(
        /['"]?(@?\w+(?:\/\w+)*)['"]?\s*:\s*['"]([^'"]+)['"]/g,
      );

      for (const match of entries) {
        const alias = match[1];
        const target = match[2];
        result[alias] = path.resolve(process.cwd(), target);
      }
    }
  } catch {
    // Ignore errors reading babel config
  }

  return result;
}

export function resolveImportPath(
  importPath: string,
  aliases: ResolvedAliases,
): string {
  for (const [alias, target] of Object.entries(aliases)) {
    if (importPath === alias || importPath.startsWith(`${alias}/`)) {
      return importPath.replace(alias, target);
    }
  }
  return importPath;
}
