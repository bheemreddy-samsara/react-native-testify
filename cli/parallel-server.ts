import {
  type IncomingMessage,
  createServer as createHttpServer,
} from 'node:http';
import { WebSocketServer } from 'ws';

type Platform = 'ios' | 'android';

interface Client {
  id: string;
  ws: WebSocketLike;
  platform: Platform;
  isReady: boolean;
  messageHandlers: Map<string, (data: Record<string, unknown>) => void>;
}

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

interface ParallelServer {
  start(): Promise<void>;
  stop(): void;
  waitForClients(platforms: Platform[], timeout: number): Promise<void>;
  sendConfigToAll(config: AppConfig): void;
  getConnectedPlatforms(): Platform[];
  mountComponentOnAll(name: string): Promise<void>;
  mountComponent(platform: Platform, name: string): Promise<void>;
  unmountComponentOnAll(): Promise<void>;
  unmountComponent(platform: Platform): Promise<void>;
  getComponentList(): Promise<string[]>;
}

type WebSocketLike = {
  send: (msg: string) => void;
  on: (event: 'message' | 'close', listener: (data?: unknown) => void) => void;
};

type WebSocketServerController = {
  start: (port: number) => void;
  stop: () => void;
};

type WebSocketServerFactory = (handlers: {
  onConnection: (ws: WebSocketLike, req?: IncomingMessage) => void;
}) => WebSocketServerController;

function createDefaultWebSocketServer({
  onConnection,
}: {
  onConnection: (ws: WebSocketLike, req?: IncomingMessage) => void;
}): WebSocketServerController {
  let httpServer: ReturnType<typeof createHttpServer> | null = null;
  let websocketServer: WebSocketServer | null = null;

  return {
    start(port) {
      httpServer = createHttpServer((_, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Testify Parallel Server');
      });

      websocketServer = new WebSocketServer({ server: httpServer });
      websocketServer.on('connection', (ws, req) => {
        onConnection(ws, req);
      });

      httpServer.listen(port);
    },
    stop() {
      websocketServer?.close();
      httpServer?.close();
    },
  };
}

export function createParallelServer(
  port: number,
  deps: { createWebSocketServer?: WebSocketServerFactory } = {},
): ParallelServer {
  let websocketServer: WebSocketServerController | null = null;
  const clients: Map<Platform, Client> = new Map();
  const pendingReady: Map<Platform, () => void> = new Map();
  let lastConfig: AppConfig | null = null;

  const createWebSocketServer =
    deps.createWebSocketServer ?? createDefaultWebSocketServer;

  const waitForMessage = (
    client: Client,
    type: string,
    timeout = DEFAULT_MESSAGE_TIMEOUT_MS,
  ): Promise<Record<string, unknown>> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        client.messageHandlers.delete(type);
        reject(
          new Error(`Timeout waiting for ${type} from ${client.platform}`),
        );
      }, timeout);

      client.messageHandlers.set(type, (data) => {
        clearTimeout(timer);
        client.messageHandlers.delete(type);
        resolve(data);
      });
    });
  };

  const sendToClient = (client: Client, data: Record<string, unknown>) => {
    if (client.ws && typeof client.ws.send === 'function') {
      client.ws.send(JSON.stringify(data));
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

  const handleMessage = (client: Client, data: Record<string, unknown>) => {
    if (data.type === 'ready') {
      client.isReady = true;
      const resolver = pendingReady.get(client.platform);
      if (resolver) {
        resolver();
        pendingReady.delete(client.platform);
      }
      if (data.platform) {
        client.platform = data.platform as Platform;
      }
      return;
    }

    const handler = client.messageHandlers.get(data.type as string);
    if (handler) {
      handler(data);
    }
  };

  return {
    async start() {
      websocketServer = createWebSocketServer({
        onConnection(ws, req) {
          const url = new URL(req?.url ?? '/', `http://localhost:${port}`);
          const platform =
            (url.searchParams.get('platform') as Platform) || 'ios';

          const client: Client = {
            id: `${platform}-${Date.now()}`,
            ws,
            platform,
            isReady: false,
            messageHandlers: new Map(),
          };

          clients.delete(platform);
          clients.set(platform, client);

          console.log(`[Server] ${platform} client connected`);

          ws.on('message', (message) => {
            try {
              const parsed = JSON.parse(String(message)) as Record<
                string,
                unknown
              >;
              handleMessage(client, parsed);
            } catch (e) {
              console.error('[Server] Invalid message:', e);
            }
          });

          ws.on('close', () => {
            console.log(`[Server] ${platform} client disconnected`);
            clients.delete(platform);
          });
        },
      });

      websocketServer.start(port);

      console.log(
        `[Server] Parallel server listening on ws://localhost:${port}`,
      );
    },

    stop() {
      websocketServer?.stop();
      websocketServer = null;
      clients.clear();
    },

    async waitForClients(platforms: Platform[], timeout: number) {
      const start = Date.now();

      while (platforms.some((p) => !clients.has(p))) {
        if (Date.now() - start > timeout) {
          const missing = platforms.filter((p) => !clients.has(p));
          throw new Error(`Timeout waiting for clients: ${missing.join(', ')}`);
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      const readyPromises = platforms.map((platform) => {
        const client = clients.get(platform);
        if (!client) {
          return Promise.reject(new Error(`Client for ${platform} not found`));
        }

        if (client.isReady) {
          return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            pendingReady.delete(platform);
            reject(new Error(`Timeout waiting for ${platform} ready`));
          }, timeout);

          pendingReady.set(platform, () => {
            clearTimeout(timer);
            resolve();
          });
        });
      });

      await Promise.all(readyPromises);
    },

    sendConfigToAll(config: AppConfig) {
      lastConfig = config;

      for (const client of clients.values()) {
        sendToClient(client, { type: 'configure', ...config });
      }
    },

    getConnectedPlatforms(): Platform[] {
      return Array.from(clients.keys());
    },

    async mountComponentOnAll(name: string) {
      const timeout = getMountTimeoutMs();
      const promises = Array.from(clients.values()).map((client) => {
        sendToClient(client, { type: 'mount', component: name });
        return waitForMessage(client, 'mounted', timeout);
      });
      await Promise.all(promises);
    },

    async mountComponent(platform: Platform, name: string) {
      const client = clients.get(platform);
      if (!client) throw new Error(`Client for ${platform} not connected`);

      const timeout = getMountTimeoutMs();
      sendToClient(client, { type: 'mount', component: name });
      await waitForMessage(client, 'mounted', timeout);
    },

    async unmountComponentOnAll() {
      const promises = Array.from(clients.values()).map((client) => {
        sendToClient(client, { type: 'unmount' });
        return waitForMessage(client, 'unmounted');
      });
      await Promise.all(promises);
    },

    async unmountComponent(platform: Platform) {
      const client = clients.get(platform);
      if (!client) throw new Error(`Client for ${platform} not connected`);

      sendToClient(client, { type: 'unmount' });
      await waitForMessage(client, 'unmounted');
    },

    async getComponentList() {
      const client = clients.get('ios') ?? Array.from(clients.values())[0];
      if (!client) return [];

      sendToClient(client, { type: 'list' });
      const response = await waitForMessage(client, 'components');
      const components = response.components as string[] | undefined;
      return components ?? [];
    },
  };
}
