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
  baselineStorage?: 'local' | 's3' | 'gcs';
  ios?: {
    simulator?: string;
    scheme?: string;
    workspace?: string;
    viewport?: { width: number; height: number };
  };
  android?: {
    emulator?: string;
    packageName?: string;
    viewport?: { width: number; height: number };
  };
}) {
  return config;
}
