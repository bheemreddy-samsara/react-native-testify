import {
  type IncomingMessage,
  createServer as createHttpServer,
} from 'node:http';
import { WebSocketServer } from 'ws';

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
        res.end('WebSocket server');
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

export function createServer(
  port: number,
  deps: { createWebSocketServer?: WebSocketServerFactory } = {},
): TestifyServer {
  let websocketServer: WebSocketServerController | null = null;
  let connectedClient: WebSocketLike | null = null;
  let readyClient: WebSocketLike | null = null;
  let readyHandler: PendingReadyHandler | null = null;
  let lastConfig: AppConfig | null = null;
  const messageHandlers: Map<string, PendingMessageHandler> = new Map();

  const createWebSocketServer =
    deps.createWebSocketServer ?? createDefaultWebSocketServer;

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

    if (typeof connectedClient.send !== 'function') {
      throw new Error('Invalid WebSocket client');
    }

    connectedClient.send(JSON.stringify(data));
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

  const handleMessage = (ws: WebSocketLike, message: unknown) => {
    try {
      const data = JSON.parse(String(message)) as Record<string, unknown>;

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
  };

  const handleClose = (ws: WebSocketLike) => {
    console.log('[Server] Client disconnected');
    if (ws === connectedClient) {
      connectedClient = null;
      readyClient = null;
      rejectReadyWait(new Error('Client disconnected'));
      rejectAllPendingMessages(new Error('Client disconnected'));
    }
  };

  return {
    async start() {
      websocketServer = createWebSocketServer({
        onConnection(ws) {
          console.log('[Server] Client connected');

          if (connectedClient && ws !== connectedClient) {
            rejectReadyWait(new Error('Client replaced'));
            rejectAllPendingMessages(new Error('Client replaced'));
          }

          connectedClient = ws;
          readyClient = null;

          ws.on('message', (message) => handleMessage(ws, message));
          ws.on('close', () => handleClose(ws));
        },
      });

      websocketServer.start(port);

      console.log(`[Server] Listening on ws://localhost:${port}`);
    },

    stop() {
      websocketServer?.stop();
      websocketServer = null;
      connectedClient = null;
      readyClient = null;
      rejectReadyWait(new Error('Server stopped'));
      rejectAllPendingMessages(new Error('Server stopped'));
    },

    async waitForConnection(timeout: number) {
      if (readyClient) return;

      return new Promise((resolve, reject) => {
        readyHandler = {
          resolve: () => {
            readyHandler = null;
            resolve();
          },
          reject: (error) => {
            readyHandler = null;
            reject(error);
          },
          timer: setTimeout(() => {
            readyHandler?.reject(
              new Error('Timeout waiting for app connection'),
            );
          }, timeout),
        };
      });
    },

    sendConfig(config: AppConfig) {
      lastConfig = config;
      if (!readyClient) return;

      try {
        sendToClient({ type: 'configure', ...config });
      } catch {
        // no-op
      }
    },

    async getComponentList() {
      sendToClient({ type: 'list' });
      const response = await waitForMessage('components');
      const components = response.components as string[] | undefined;
      return components ?? [];
    },

    async mountComponent(name: string) {
      const timeout = getMountTimeoutMs();
      sendToClient({ type: 'mount', component: name });
      await waitForMessage('mounted', timeout);
    },

    async unmountComponent() {
      sendToClient({ type: 'unmount' });
      await waitForMessage('unmounted');
    },
  };
}
