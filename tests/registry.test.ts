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
});
