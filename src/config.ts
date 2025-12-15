export type Viewport = {
  width: number;
  height: number;
};

export type PolyfillsConfig =
  | 'auto'
  | {
      buffer?: boolean;
      crypto?: boolean;
      process?: boolean;
    };

export type AliasesConfig = 'auto' | Record<string, string>;

export type TestifyUserConfig = {
  entry?: string;
  registry?: string;
  baselines?: string;
  threshold?: number;
  port?: number;
  defaultWaitMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
  gitLfs?: boolean;
  ios?: {
    simulator?: string;
    scheme?: string;
    workspace?: string;
    bundleId?: string;
    viewport?: Viewport;
  };
  android?: {
    emulator?: string;
    packageName?: string;
    viewport?: Viewport;
    projectDir?: string;
    gradleTask?: string;
  };
  statusBar?: {
    freeze?: boolean;
  };
  polyfills?: PolyfillsConfig;
  aliases?: AliasesConfig;
  discovery?: {
    enabled?: boolean;
    pattern?: string;
    rootDir?: string;
    exclude?: string[];
    generatedRegistry?: string;
  };
  idleDetection?: {
    enabled?: boolean;
    timeoutMs?: number;
    debounceMs?: number;
  };
};

export function defineConfig(config: TestifyUserConfig): TestifyUserConfig {
  return config;
}
