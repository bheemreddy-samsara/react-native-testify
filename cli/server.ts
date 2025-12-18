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

type PendingMessageHandler = {
  resolve: (data: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type PendingReadyHandler = {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

interface TestifyServer {
  start(): Promise<void>;
  stop(): void;
  waitForConnection(timeout: number): Promise<void>;
  sendConfig(config: AppConfig): void;
  getComponentList(): Promise<string[]>;
  mountComponent(name: string): Promise<void>;
  unmountComponent(): Promise<void>;
}

type WebsocketHandler = {
  open: (ws: unknown) => void;
  message: (ws: unknown, message: unknown) => void;
  close: (ws: unknown) => void;
};

type ServeOptions = {
  port: number;
  fetch: (
    req: Request,
    server: { upgrade: (req: Request) => boolean },
  ) => Response | undefined;
  websocket: WebsocketHandler;
};

type ServeFn = (options: ServeOptions) => { stop?: () => void };

export function createServer(
  port: number,
  deps: { serve?: ServeFn } = {},
): TestifyServer {
  let server: unknown = null;
  let connectedClient: unknown = null;
  let readyClient: unknown = null;
  let readyHandler: PendingReadyHandler | null = null;
  let lastConfig: AppConfig | null = null;
  const messageHandlers: Map<string, PendingMessageHandler> = new Map();

  const serve: ServeFn = deps.serve ?? (Bun.serve as unknown as ServeFn);

  const waitForMessage = (
    type: string,
    timeout = DEFAULT_MESSAGE_TIMEOUT_MS,
  ): Promise<Record<string, unknown>> => {
    if (messageHandlers.has(type)) {
      throw new Error(`Already waiting for ${type}`);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        messageHandlers.delete(type);
        reject(new Error(`Timeout waiting for ${type}`));
      }, timeout);

      messageHandlers.set(type, {
        resolve: (data) => {
          clearTimeout(timer);
          messageHandlers.delete(type);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timer);
          messageHandlers.delete(type);
          reject(error);
        },
        timer,
      });
    });
  };

  const sendToClient = (data: Record<string, unknown>) => {
    if (!connectedClient) {
      throw new Error('No app connected');
    }

    if (
      typeof (connectedClient as { send: (msg: string) => void }).send !==
      'function'
    ) {
      throw new Error('Invalid WebSocket client');
    }

    (connectedClient as { send: (msg: string) => void }).send(
      JSON.stringify(data),
    );
  };

  const rejectAllPendingMessages = (error: Error) => {
    for (const handler of Array.from(messageHandlers.values())) {
      handler.reject(error);
    }
    messageHandlers.clear();
  };

  const rejectReadyWait = (error: Error) => {
    if (!readyHandler) return;
    clearTimeout(readyHandler.timer);
    readyHandler.reject(error);
    readyHandler = null;
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
      server = serve({
        port,
        fetch(req, server) {
          if (server.upgrade(req)) return;
          return new Response('WebSocket server', { status: 200 });
        },
        websocket: {
          open(ws) {
            console.log('[Server] Client connected');

            if (connectedClient && ws !== connectedClient) {
              rejectReadyWait(new Error('Client replaced'));
              rejectAllPendingMessages(new Error('Client replaced'));
            }

            connectedClient = ws;
            readyClient = null;
          },
          message(ws, message) {
            try {
              const data = JSON.parse(String(message)) as Record<
                string,
                unknown
              >;

              // Handle "ready" message specially to avoid race condition
              if (data.type === 'ready') {
                if (ws !== connectedClient) return;

                readyClient = ws;

                if (lastConfig) {
                  try {
                    sendToClient({ type: 'configure', ...lastConfig });
                  } catch {
                    // no-op
                  }
                }

                if (readyHandler) {
                  clearTimeout(readyHandler.timer);
                  readyHandler.resolve();
                  readyHandler = null;
                }
                return;
              }

              const handler = messageHandlers.get(data.type as string);
              if (handler) handler.resolve(data);
            } catch (e) {
              console.error('[Server] Invalid message:', e);
            }
          },
          close(ws) {
            console.log('[Server] Client disconnected');
            if (ws === connectedClient) {
              connectedClient = null;
              readyClient = null;
              rejectReadyWait(new Error('Client disconnected'));
              rejectAllPendingMessages(new Error('Client disconnected'));
            }
          },
        },
      });

      console.log(`[Server] Listening on ws://localhost:${port}`);
    },

    stop() {
      rejectReadyWait(new Error('Server stopped'));
      rejectAllPendingMessages(new Error('Server stopped'));

      if (
        connectedClient &&
        typeof (connectedClient as { close: () => void }).close === 'function'
      ) {
        try {
          (connectedClient as { close: () => void }).close();
        } catch {
          // no-op
        }
      }

      connectedClient = null;
      readyClient = null;

      if (
        server &&
        typeof (server as { stop: () => void }).stop === 'function'
      ) {
        (server as { stop: () => void }).stop();
      }

      server = null;
    },

    async waitForConnection(timeout: number) {
      const start = Date.now();
      while (!connectedClient) {
        if (Date.now() - start > timeout) {
          throw new Error('Timeout waiting for app connection');
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      // If already received ready message for this connection, return immediately
      if (readyClient && readyClient === connectedClient) {
        return;
      }

      // Otherwise wait for ready message
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Timeout waiting for ready message'));
        }, 10000);

        readyHandler = {
          resolve: () => {
            clearTimeout(timer);
            resolve();
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
          timer,
        };

        if (readyClient && readyClient === connectedClient) {
          clearTimeout(timer);
          readyHandler = null;
          resolve();
        }
      });
    },

    sendConfig(config: AppConfig) {
      lastConfig = config;

      // If the app reconnects, it will be reconfigured on the next ready message.
      try {
        sendToClient({ type: 'configure', ...config });
      } catch {
        // no-op
      }
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
