import { describe, expect, test, vi } from 'vitest';

let afterInteractionsDelayMs = 0;

vi.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: (callback: () => void) => {
      const id = setTimeout(callback, afterInteractionsDelayMs);
      return {
        cancel: () => {
          clearTimeout(id);
        },
      };
    },
  },
}));

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('createIdleCallback', () => {
  test('invokes callback at most once when idle occurs after timeout', async () => {
    afterInteractionsDelayMs = 40;

    const { createIdleCallback } = await import('../src/idleDetection');

    let callCount = 0;
    createIdleCallback(
      () => {
        callCount += 1;
      },
      { timeoutMs: 10, debounceMs: 20 },
    );

    await delay(120);
    expect(callCount).toBe(1);
  });

  test('does not invoke callback after cancellation', async () => {
    afterInteractionsDelayMs = 10;

    const { createIdleCallback } = await import('../src/idleDetection');

    let callCount = 0;
    const cancel = createIdleCallback(
      () => {
        callCount += 1;
      },
      { timeoutMs: 50, debounceMs: 10 },
    );

    cancel();
    await delay(100);
    expect(callCount).toBe(0);
  });
});
