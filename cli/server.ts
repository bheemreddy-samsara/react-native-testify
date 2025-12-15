export interface IdleDetectionConfig {
  enabled: boolean;
  timeoutMs: number;
  debounceMs: number;
}

export interface AppConfig {
  idleDetection?: IdleDetectionConfig;
  defaultWaitMs?: number;
}

const DEFAULT_MESSAGE_TIMEOUT_MS = 30_000;
const MOUNT_TIMEOUT_PADDING_MS = 5_000;

interface TestifyServer {
  start(): Promise<void>;
  stop(): void;
  waitForConnection(timeout: number): Promise<void>;
  sendConfig(config: AppConfig): void;
  getComponentList(): Promise<string[]>;
  mountComponent(name: string): Promise<void>;
  unmountComponent(): Promise<void>;
}

export function createServer(port: number): TestifyServer {
  let server: unknown = null;
  let connectedClient: unknown = null;
  let isReady = false;
  let readyResolver: (() => void) | null = null;
  let lastConfig: AppConfig | null = null;
  const messageHandlers: Map<string, (data: Record<string, unknown>) => void> =
    new Map();

  const waitForMessage = (
    type: string,
    timeout = DEFAULT_MESSAGE_TIMEOUT_MS,
  ): Promise<Record<string, unknown>> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        messageHandlers.delete(type);
        reject(new Error(`Timeout waiting for ${type}`));
      }, timeout);

      messageHandlers.set(type, (data) => {
        clearTimeout(timer);
        messageHandlers.delete(type);
        resolve(data);
      });
    });
  };

  const sendToClient = (data: Record<string, unknown>) => {
    if (
      connectedClient &&
      typeof (connectedClient as { send: (msg: string) => void }).send ===
        'function'
    ) {
      (connectedClient as { send: (msg: string) => void }).send(
        JSON.stringify(data),
      );
    }
  };

  const getMountTimeoutMs = (): number => {
    let timeout = DEFAULT_MESSAGE_TIMEOUT_MS;
    const idleDetection = lastConfig?.idleDetection;

    if (idleDetection?.enabled) {
      timeout = Math.max(
        timeout,
        idleDetection.timeoutMs +
          idleDetection.debounceMs +
          MOUNT_TIMEOUT_PADDING_MS,
      );
    }

    if (typeof lastConfig?.defaultWaitMs === 'number') {
      timeout = Math.max(
        timeout,
        lastConfig.defaultWaitMs + MOUNT_TIMEOUT_PADDING_MS,
      );
    }

    return timeout;
  };

  return {
    async start() {
      // Use Bun's native WebSocket server
      server = Bun.serve({
        port,
        fetch(req, server) {
          if (server.upgrade(req)) return;
          return new Response('WebSocket server', { status: 200 });
        },
        websocket: {
          open(ws) {
            console.log('[Server] Client connected');
            connectedClient = ws;
          },
          message(ws, message) {
            try {
              const data = JSON.parse(String(message)) as Record<
                string,
                unknown
              >;

              // Handle "ready" message specially to avoid race condition
              if (data.type === 'ready') {
                isReady = true;
                if (readyResolver) {
                  readyResolver();
                  readyResolver = null;
                }
                return;
              }

              const handler = messageHandlers.get(data.type as string);
              if (handler) {
                handler(data);
              }
            } catch (e) {
              console.error('[Server] Invalid message:', e);
            }
          },
          close() {
            console.log('[Server] Client disconnected');
            connectedClient = null;
          },
        },
      });

      console.log(`[Server] Listening on ws://localhost:${port}`);
    },

    stop() {
      if (
        server &&
        typeof (server as { stop: () => void }).stop === 'function'
      ) {
        (server as { stop: () => void }).stop();
      }
    },

    async waitForConnection(timeout: number) {
      const start = Date.now();
      while (!connectedClient) {
        if (Date.now() - start > timeout) {
          throw new Error('Timeout waiting for app connection');
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      // If already received ready message, return immediately
      if (isReady) {
        return;
      }

      // Otherwise wait for ready message
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Timeout waiting for ready message'));
        }, 10000);

        readyResolver = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    },

    sendConfig(config: AppConfig) {
      lastConfig = config;
      sendToClient({ type: 'configure', ...config });
    },

    async getComponentList(): Promise<string[]> {
      sendToClient({ type: 'list' });
      const response = await waitForMessage('components');
      return (response.components as string[]) || [];
    },

    async mountComponent(name: string) {
      sendToClient({ type: 'mount', component: name });
      await waitForMessage('mounted', getMountTimeoutMs());
    },

    async unmountComponent() {
      sendToClient({ type: 'unmount' });
      await waitForMessage('unmounted');
    },
  };
}
