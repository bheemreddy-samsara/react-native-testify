export { TestifyApp } from './TestifyApp';
export type { IdleDetectionConfig } from './TestifyApp';
export { IdleScreen } from './IdleScreen';
export { createRegistry } from './registry';
export {
  waitForIdle,
  waitForRenderComplete,
  createIdleCallback,
} from './idleDetection';
export type { IdleDetectionOptions } from './idleDetection';
export type {
  Registry,
  ComponentRenderer,
  ComponentConfig,
  ComponentEntry,
  RegistryOptions,
  WrapperComponent,
  ProviderConfig,
  StoreFactory,
} from './registry';
export type {
  ConnectionStatus,
  Platform,
  IdleDetectionConfig as ConnectionIdleConfig,
} from './connection';

// Config helper for typed config files
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
export type { TestifyConnection, TestifyMessage } from './connection';
