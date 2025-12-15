import { describe, expect, test } from 'bun:test';
import type { ReactElement, ReactNode } from 'react';
import { createRegistry } from '../src/registry';

const mockRenderer = (): ReactElement => null as unknown as ReactElement;

describe('createRegistry', () => {
  test('creates registry with simple component renderers', () => {
    const registry = createRegistry({
      Button: mockRenderer,
      Card: mockRenderer,
    });

    expect(registry.list()).toEqual(['Button', 'Card']);
    expect(registry.has('Button')).toBe(true);
    expect(registry.has('Unknown')).toBe(false);
  });

  test('returns resolved component with default waitMs', () => {
    const registry = createRegistry({ Button: mockRenderer });

    const resolved = registry.get('Button');

    expect(resolved).toBeDefined();
    expect(resolved?.render).toBe(mockRenderer);
    expect(resolved?.waitMs).toBe(500); // default
    expect(resolved?.waitFor).toBeUndefined();
  });

  test('returns undefined for unknown component', () => {
    const registry = createRegistry({ Button: mockRenderer });

    expect(registry.get('Unknown')).toBeUndefined();
  });

  test('supports custom defaultWaitMs', () => {
    const registry = createRegistry(
      { Button: mockRenderer },
      { defaultWaitMs: 1000 },
    );

    const resolved = registry.get('Button');
    expect(resolved?.waitMs).toBe(1000);
  });

  test('supports per-component waitMs override', () => {
    const registry = createRegistry(
      {
        Fast: mockRenderer,
        Slow: {
          render: mockRenderer,
          waitMs: 2000,
        },
      },
      { defaultWaitMs: 500 },
    );

    expect(registry.get('Fast')?.waitMs).toBe(500);
    expect(registry.get('Slow')?.waitMs).toBe(2000);
  });

  test('supports waitFor async function', async () => {
    let called = false;
    const waitFor = async () => {
      called = true;
    };

    const registry = createRegistry({
      AsyncComponent: {
        render: mockRenderer,
        waitFor,
      },
    });

    const resolved = registry.get('AsyncComponent');
    expect(resolved?.waitFor).toBe(waitFor);

    await resolved?.waitFor?.();
    expect(called).toBe(true);
  });

  test('supports wrapper option', () => {
    const wrapper = (children: ReactNode): ReactElement =>
      children as unknown as ReactElement;
    const registry = createRegistry({ Button: mockRenderer }, { wrapper });

    expect(registry.getWrapper()).toBe(wrapper);
  });

  test('returns undefined wrapper when not provided', () => {
    const registry = createRegistry({ Button: mockRenderer });

    expect(registry.getWrapper()).toBeUndefined();
  });

  test('returns empty providers array when not provided', () => {
    const registry = createRegistry({ Button: mockRenderer });

    expect(registry.getProviders()).toEqual([]);
  });

  test('returns configured providers', () => {
    const MockProvider = ({ children }: { children: ReactNode }) =>
      children as unknown as ReactElement;

    const providers = [
      { component: MockProvider, props: { theme: 'dark' } },
      { component: MockProvider },
    ];

    const registry = createRegistry({ Button: mockRenderer }, { providers });

    expect(registry.getProviders()).toEqual(providers);
  });

  test('returns undefined storeFactory when not provided', () => {
    const registry = createRegistry({ Button: mockRenderer });

    expect(registry.getStoreFactory()).toBeUndefined();
  });

  test('returns configured storeFactory', () => {
    const storeFactory = () => ({ state: 'initial' });
    const registry = createRegistry({ Button: mockRenderer }, { storeFactory });

    expect(registry.getStoreFactory()).toBe(storeFactory);
  });

  test('shouldIsolateStore returns false by default', () => {
    const registry = createRegistry({ Button: mockRenderer });

    expect(registry.shouldIsolateStore()).toBe(false);
    expect(registry.shouldIsolateStore('Button')).toBe(false);
  });

  test('shouldIsolateStore returns global setting when enabled', () => {
    const registry = createRegistry(
      { Button: mockRenderer },
      { storeIsolation: true },
    );

    expect(registry.shouldIsolateStore()).toBe(true);
    expect(registry.shouldIsolateStore('Button')).toBe(true);
  });

  test('shouldIsolateStore respects per-component freshStore override', () => {
    const registry = createRegistry(
      {
        SharedStore: mockRenderer,
        FreshStore: {
          render: mockRenderer,
          freshStore: true,
        },
        ExplicitShared: {
          render: mockRenderer,
          freshStore: false,
        },
      },
      { storeIsolation: false },
    );

    expect(registry.shouldIsolateStore('SharedStore')).toBe(false);
    expect(registry.shouldIsolateStore('FreshStore')).toBe(true);
    expect(registry.shouldIsolateStore('ExplicitShared')).toBe(false);
  });

  test('per-component freshStore overrides global storeIsolation', () => {
    const registry = createRegistry(
      {
        Default: mockRenderer,
        SharedOverride: {
          render: mockRenderer,
          freshStore: false,
        },
      },
      { storeIsolation: true },
    );

    expect(registry.shouldIsolateStore('Default')).toBe(true);
    expect(registry.shouldIsolateStore('SharedOverride')).toBe(false);
  });
});
