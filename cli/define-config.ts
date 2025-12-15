// CLI-only defineConfig - doesn't import React Native
export function defineConfig(config: {
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
    viewport?: { width: number; height: number };
  };
  android?: {
    emulator?: string;
    packageName?: string;
    viewport?: { width: number; height: number };
  };
  statusBar?: {
    freeze?: boolean;
  };
  polyfills?:
    | 'auto'
    | {
        buffer?: boolean;
        crypto?: boolean;
        process?: boolean;
      };
  aliases?: 'auto' | Record<string, string>;
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
}) {
  return config;
}
