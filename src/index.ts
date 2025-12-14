export { TestifyApp } from './TestifyApp';
export { IdleScreen } from './IdleScreen';
export { createRegistry } from './registry';
export type {
  Registry,
  ComponentRenderer,
  ComponentConfig,
  ComponentEntry,
  RegistryOptions,
  WrapperComponent,
} from './registry';
export type { ConnectionStatus } from './connection';

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
export type { TestifyConnection, TestifyMessage } from './connection';
