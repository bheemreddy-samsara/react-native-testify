import type { ComponentType, ReactElement, ReactNode } from 'react';

export type ComponentRenderer = () => ReactElement;
export type WrapperComponent = (children: ReactNode) => ReactElement;
export type StoreFactory<T = unknown> = () => T;

export interface ProviderConfig {
  component: ComponentType<{ children: ReactNode }>;
  props?: Record<string, unknown>;
}

export interface ComponentConfig {
  render: ComponentRenderer;
  waitMs?: number;
  waitFor?: () => Promise<void>;
  freshStore?: boolean;
}

export type ComponentEntry = ComponentRenderer | ComponentConfig;

export interface RegistryOptions {
  wrapper?: WrapperComponent;
  providers?: ProviderConfig[];
  storeFactory?: StoreFactory;
  storeIsolation?: boolean;
  defaultWaitMs?: number;
}

export interface ResolvedComponent {
  render: ComponentRenderer;
  waitMs: number;
  usesDefaultWaitMs?: boolean;
  waitFor?: () => Promise<void>;
  freshStore?: boolean;
}

export interface Registry {
  components: Map<string, ComponentEntry>;
  options: RegistryOptions;
  get(name: string): ResolvedComponent | undefined;
  list(): string[];
  has(name: string): boolean;
  getWrapper(): WrapperComponent | undefined;
  getProviders(): ProviderConfig[];
  getStoreFactory(): StoreFactory | undefined;
  shouldIsolateStore(componentName?: string): boolean;
}

function isComponentConfig(entry: ComponentEntry): entry is ComponentConfig {
  return typeof entry === 'object' && 'render' in entry;
}

export function createRegistry(
  components: Record<string, ComponentEntry>,
  options: RegistryOptions = {},
): Registry {
  const map = new Map<string, ComponentEntry>(Object.entries(components));
  const defaultWaitMs = options.defaultWaitMs ?? 500;

  return {
    components: map,
    options,

    get(name: string): ResolvedComponent | undefined {
      const entry = map.get(name);
      if (!entry) return undefined;

      if (isComponentConfig(entry)) {
        return {
          render: entry.render,
          waitMs: entry.waitMs ?? defaultWaitMs,
          usesDefaultWaitMs: entry.waitMs === undefined,
          waitFor: entry.waitFor,
          freshStore: entry.freshStore,
        };
      }

      return {
        render: entry,
        waitMs: defaultWaitMs,
        usesDefaultWaitMs: true,
      };
    },

    list() {
      return Array.from(map.keys());
    },

    has(name: string) {
      return map.has(name);
    },

    getWrapper() {
      return options.wrapper;
    },

    getProviders() {
      return options.providers ?? [];
    },

    getStoreFactory() {
      return options.storeFactory;
    },

    shouldIsolateStore(componentName?: string): boolean {
      if (componentName) {
        const entry = map.get(componentName);
        if (
          entry &&
          isComponentConfig(entry) &&
          entry.freshStore !== undefined
        ) {
          return entry.freshStore;
        }
      }
      return options.storeIsolation ?? false;
    },
  };
}
