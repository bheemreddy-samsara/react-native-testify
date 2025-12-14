import type { ReactElement, ReactNode } from 'react';

export type ComponentRenderer = () => ReactElement;
export type WrapperComponent = (children: ReactNode) => ReactElement;

export interface ComponentConfig {
  render: ComponentRenderer;
  waitMs?: number; // Per-component render delay
  waitFor?: () => Promise<void>; // Custom wait condition
}

export type ComponentEntry = ComponentRenderer | ComponentConfig;

export interface RegistryOptions {
  wrapper?: WrapperComponent;
  defaultWaitMs?: number;
}

export interface ResolvedComponent {
  render: ComponentRenderer;
  waitMs: number;
  waitFor?: () => Promise<void>;
}

export interface Registry {
  components: Map<string, ComponentEntry>;
  options: RegistryOptions;
  get(name: string): ResolvedComponent | undefined;
  list(): string[];
  has(name: string): boolean;
  getWrapper(): WrapperComponent | undefined;
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
          waitFor: entry.waitFor,
        };
      }

      return {
        render: entry,
        waitMs: defaultWaitMs,
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
  };
}
