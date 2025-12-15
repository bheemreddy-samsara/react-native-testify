import { InteractionManager } from 'react-native';

export interface IdleDetectionOptions {
  timeoutMs?: number;
  debounceMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_DEBOUNCE_MS = 100;

export function waitForIdle(options: IdleDetectionOptions = {}): Promise<void> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, debounceMs = DEFAULT_DEBOUNCE_MS } =
    options;

  return new Promise((resolve) => {
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    let interactionHandle: { cancel: () => void } | null = null;

    const cleanup = (tid: ReturnType<typeof setTimeout>) => {
      clearTimeout(tid);
      if (debounceId) clearTimeout(debounceId);
      if (interactionHandle) interactionHandle.cancel();
    };

    // Set overall timeout
    const timeoutId = setTimeout(() => {
      cleanup(timeoutId);
      // Resolve even on timeout - don't fail the test
      resolve();
    }, timeoutMs);

    const checkIdle = () => {
      // Clear any existing debounce
      if (debounceId) {
        clearTimeout(debounceId);
        debounceId = null;
      }

      // Use InteractionManager to wait for JS thread idle
      interactionHandle = InteractionManager.runAfterInteractions(() => {
        // Add debounce to ensure stability
        debounceId = setTimeout(() => {
          cleanup(timeoutId);
          resolve();
        }, debounceMs);
      });
    };

    // Start the idle check
    checkIdle();
  });
}

export function createIdleCallback(
  callback: () => void,
  options: IdleDetectionOptions = {},
): () => void {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, debounceMs = DEFAULT_DEBOUNCE_MS } =
    options;

  let cancelled = false;

  // Start timeout
  const timeoutId = setTimeout(() => {
    if (!cancelled) callback();
  }, timeoutMs);

  // Use InteractionManager
  const handle = InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      if (!cancelled) {
        clearTimeout(timeoutId);
        callback();
      }
    }, debounceMs);
  });

  // Return cancel function
  return () => {
    cancelled = true;
    clearTimeout(timeoutId);
    handle.cancel();
  };
}

export async function waitForRenderComplete(
  options: IdleDetectionOptions = {},
): Promise<void> {
  // First, wait for any pending React updates (next frame)
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // Then wait for InteractionManager idle
  await waitForIdle(options);
}
