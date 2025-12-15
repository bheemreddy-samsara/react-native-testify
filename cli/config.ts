import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';

const ViewportSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

const IosConfigSchema = z.object({
  simulator: z.string().default('iPhone 15 Pro'),
  scheme: z.string().optional(),
  workspace: z.string().optional(),
  bundleId: z.string().optional(),
  viewport: ViewportSchema.optional(),
});

const AndroidConfigSchema = z.object({
  emulator: z.string().default('Pixel_7_API_34'),
  packageName: z.string().optional(),
  viewport: ViewportSchema.optional(),
});

const PolyfillsConfigSchema = z.union([
  z.literal('auto'),
  z.object({
    buffer: z.boolean().default(false),
    crypto: z.boolean().default(false),
    process: z.boolean().default(false),
  }),
]);

const AliasesConfigSchema = z.union([
  z.literal('auto'),
  z.record(z.string(), z.string()),
]);

const TestifyConfigSchema = z.object({
  entry: z.string().default('./index.testify.js'),
  registry: z.string().default('./testify/registry.tsx'),
  baselines: z.string().default('./testify/baselines'),
  threshold: z.number().min(0).max(1).default(0.01),
  port: z.number().int().positive().default(8089),
  defaultWaitMs: z.number().int().positive().default(500),
  retryCount: z.number().int().min(0).default(2),
  retryDelayMs: z.number().int().positive().default(1000),
  ios: IosConfigSchema.default({}),
  android: AndroidConfigSchema.default({}),
  polyfills: PolyfillsConfigSchema.optional(),
  aliases: AliasesConfigSchema.optional(),
  gitLfs: z.boolean().default(false),
  baselineStorage: z.enum(['local', 's3', 'gcs']).default('local'),
});

export type TestifyConfig = z.infer<typeof TestifyConfigSchema>;
export type IosConfig = z.infer<typeof IosConfigSchema>;
export type AndroidConfig = z.infer<typeof AndroidConfigSchema>;
export type PolyfillsConfig = z.infer<typeof PolyfillsConfigSchema>;
export type AliasesConfig = z.infer<typeof AliasesConfigSchema>;
export type Viewport = z.infer<typeof ViewportSchema>;

export function loadConfig(configPath?: string): TestifyConfig {
  const searchPaths = configPath
    ? [configPath]
    : [
        'testify.config.ts',
        'testify.config.js',
        'testify.config.json',
        '.testifyrc.js',
        '.testifyrc.json',
      ];

  let userConfig: unknown = {};

  for (const searchPath of searchPaths) {
    const fullPath = path.resolve(process.cwd(), searchPath);
    if (fs.existsSync(fullPath)) {
      try {
        if (searchPath.endsWith('.json')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          userConfig = JSON.parse(content);
        } else {
          // For .ts/.js files, use require (bun handles TS natively)
          userConfig = require(fullPath);
          // Handle default exports
          if (
            userConfig &&
            typeof userConfig === 'object' &&
            'default' in userConfig
          ) {
            userConfig = (userConfig as { default: unknown }).default;
          }
        }
        break;
      } catch (e) {
        console.error(`Error loading config from ${searchPath}:`, e);
      }
    }
  }

  const result = TestifyConfigSchema.safeParse(userConfig);

  if (!result.success) {
    console.error('Invalid config:', result.error.format());
    throw new Error('Invalid testify configuration');
  }

  return result.data;
}

export function validateConfig(config: unknown): TestifyConfig {
  return TestifyConfigSchema.parse(config);
}
