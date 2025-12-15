type Platform = 'ios' | 'android';

interface Client {
  id: string;
  ws: unknown;
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

export function createParallelServer(port: number): ParallelServer {
  let server: unknown = null;
  const clients: Map<Platform, Client> = new Map();
  const pendingReady: Map<Platform, () => void> = new Map();
  let lastConfig: AppConfig | null = null;

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
    const ws = client.ws as { send: (msg: string) => void };
    if (ws && typeof ws.send === 'function') {
      ws.send(JSON.stringify(data));
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
      // Check for platform info
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
      server = Bun.serve<{ platform: Platform }>({
        port,
        fetch(req, srv) {
          // Extract platform from query string if provided
          const url = new URL(req.url);
          const platform =
            (url.searchParams.get('platform') as Platform) || 'ios';

          if (srv.upgrade(req, { data: { platform } })) return;
          return new Response('Testify Parallel Server', { status: 200 });
        },
        websocket: {
          open(ws) {
            const platform = ws.data?.platform || 'ios';
            const client: Client = {
              id: `${platform}-${Date.now()}`,
              ws,
              platform,
              isReady: false,
              messageHandlers: new Map(),
            };

            // Remove existing client for this platform
            clients.delete(platform);
            clients.set(platform, client);

            console.log(`[Server] ${platform} client connected`);
          },
          message(ws, message) {
            const platform = ws.data?.platform || 'ios';
            const client = clients.get(platform);
            if (!client) return;

            try {
              const data = JSON.parse(String(message)) as Record<
                string,
                unknown
              >;
              handleMessage(client, data);
            } catch (e) {
              console.error('[Server] Invalid message:', e);
            }
          },
          close(ws) {
            const platform = ws.data?.platform || 'ios';
            console.log(`[Server] ${platform} client disconnected`);
            clients.delete(platform);
          },
        },
      });

      console.log(
        `[Server] Parallel server listening on ws://localhost:${port}`,
      );
    },

    stop() {
      if (
        server &&
        typeof (server as { stop: () => void }).stop === 'function'
      ) {
        (server as { stop: () => void }).stop();
      }
      clients.clear();
    },

    async waitForClients(platforms: Platform[], timeout: number) {
      const start = Date.now();

      // Wait for all requested platforms to connect
      while (platforms.some((p) => !clients.has(p))) {
        if (Date.now() - start > timeout) {
          const missing = platforms.filter((p) => !clients.has(p));
          throw new Error(`Timeout waiting for clients: ${missing.join(', ')}`);
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      // Wait for all to be ready
      const readyPromises = platforms.map((platform) => {
        const client = clients.get(platform);
        if (!client) {
          return Promise.reject(new Error(`Client for ${platform} not found`));
        }
        if (client.isReady) return Promise.resolve();

        return new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for ${platform} ready`));
          }, 10000);

          pendingReady.set(platform, () => {
            clearTimeout(timer);
            resolve();
          });
        });
      });

      await Promise.all(readyPromises);
      console.log(`[Server] All clients ready: ${platforms.join(', ')}`);
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
      const promises = Array.from(clients.entries()).map(
        async ([platform, client]) => {
          sendToClient(client, { type: 'mount', component: name });
          await waitForMessage(client, 'mounted', getMountTimeoutMs());
          console.log(`  [${platform}] Mounted: ${name}`);
        },
      );

      await Promise.all(promises);
    },

    async mountComponent(platform: Platform, name: string) {
      const client = clients.get(platform);
      if (!client) throw new Error(`No client for platform: ${platform}`);

      sendToClient(client, { type: 'mount', component: name });
      await waitForMessage(client, 'mounted', getMountTimeoutMs());
    },

    async unmountComponentOnAll() {
      const promises = Array.from(clients.values()).map(async (client) => {
        sendToClient(client, { type: 'unmount' });
        await waitForMessage(client, 'unmounted');
      });

      await Promise.all(promises);
    },

    async unmountComponent(platform: Platform) {
      const client = clients.get(platform);
      if (!client) throw new Error(`No client for platform: ${platform}`);

      sendToClient(client, { type: 'unmount' });
      await waitForMessage(client, 'unmounted');
    },

    async getComponentList(): Promise<string[]> {
      // Get from first connected client
      const client = clients.values().next().value;
      if (!client) throw new Error('No clients connected');

      sendToClient(client, { type: 'list' });
      const response = await waitForMessage(client, 'components');
      return (response.components as string[]) || [];
    },
  };
}
