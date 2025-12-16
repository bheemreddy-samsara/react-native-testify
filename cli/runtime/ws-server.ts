import * as http from 'node:http';
import * as url from 'node:url';
import { WebSocketServer as WSServer, type WebSocket } from 'ws';

export interface WebSocketClient {
  send(data: string): void;
  data?: Record<string, unknown>;
}

export interface WebSocketServerConfig<T = unknown> {
  port: number;
  onOpen: (ws: WebSocketClient) => void;
  onMessage: (ws: WebSocketClient, message: string) => void;
  onClose: (ws: WebSocketClient) => void;
  getData?: () => T;
}

export interface WebSocketServer {
  start(): Promise<void>;
  stop(): void;
}

export function createWebSocketServer<T = unknown>(
  config: WebSocketServerConfig<T>,
): WebSocketServer {
  let httpServer: http.Server | null = null;
  let wss: WSServer | null = null;
  const clientMap = new WeakMap<WebSocket, WebSocketClient>();

  return {
    async start() {
      httpServer = http.createServer((req, res) => {
        res.writeHead(200);
        res.end('WebSocket server');
      });

      wss = new WSServer({ server: httpServer });

      wss.on('connection', (ws, req) => {
        const parsedUrl = url.parse(req.url || '', true);
        const data = { ...config.getData?.(), ...parsedUrl.query };

        const client: WebSocketClient = {
          send: (msg: string) => ws.send(msg),
          data,
        };
        clientMap.set(ws, client);

        config.onOpen(client);

        ws.on('message', (message: Buffer) => {
          config.onMessage(client, message.toString());
        });

        ws.on('close', () => {
          config.onClose(client);
          clientMap.delete(ws);
        });
      });

      await new Promise<void>((resolve) => {
        httpServer?.listen(config.port, () => resolve());
      });
    },
    stop() {
      wss?.close();
      httpServer?.close();
    },
  };
}
