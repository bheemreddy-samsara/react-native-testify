import { afterEach, describe, expect, test } from 'vitest';
import { createServer } from '../cli/server';

type MockWebSocket = {
  sent: string[];
  send: (msg: string) => void;
  on: (event: 'message' | 'close', listener: (data?: unknown) => void) => void;
  triggerMessage: (msg: string) => void;
  triggerClose: () => void;
};

type ConnectionHandler = (ws: MockWebSocket) => void;

type MockWebSocketServerFactory = {
  createWebSocketServer: (handlers: {
    onConnection: ConnectionHandler;
  }) => {
    start: (_port: number) => void;
    stop: () => void;
  };
  connect: (ws: MockWebSocket) => void;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMockWebSocketServer(): MockWebSocketServerFactory {
  let onConnection: ConnectionHandler | null = null;

  return {
    createWebSocketServer: (handlers) => {
      onConnection = handlers.onConnection;
      return {
        start: () => {},
        stop: () => {},
      };
    },
    connect: (ws) => {
      if (!onConnection) {
        throw new Error('WebSocket server not initialized');
      }
      onConnection(ws);
    },
  };
}

function createMockWebSocket(): MockWebSocket {
  const sent: string[] = [];
  const listeners: Record<'message' | 'close', ((data?: unknown) => void)[]> = {
    message: [],
    close: [],
  };

  return {
    sent,
    send: (msg: string) => {
      sent.push(msg);
    },
    on: (event, listener) => {
      listeners[event].push(listener);
    },
    triggerMessage: (msg: string) => {
      for (const listener of listeners.message) {
        listener(msg);
      }
    },
    triggerClose: () => {
      for (const listener of listeners.close) {
        listener();
      }
    },
  };
}

describe('createServer', () => {
  let server: ReturnType<typeof createServer> | null = null;

  afterEach(async () => {
    server?.stop();
    server = null;

    await delay(0);
  });

  test('waitForConnection times out when no client connects', async () => {
    const mockServer = createMockWebSocketServer();

    server = createServer(9998, {
      createWebSocketServer: mockServer.createWebSocketServer,
    });
    await server.start();

    await expect(server.waitForConnection(120)).rejects.toThrow(
      'Timeout waiting for app connection',
    );
  });

  test('handles client connection and ready message', async () => {
    const mockServer = createMockWebSocketServer();

    server = createServer(9997, {
      createWebSocketServer: mockServer.createWebSocketServer,
    });
    await server.start();

    const ws = createMockWebSocket();

    mockServer.connect(ws);
    ws.triggerMessage(JSON.stringify({ type: 'ready' }));

    await server.waitForConnection(2000);
  });

  test('getComponentList sends list request and receives response', async () => {
    const mockServer = createMockWebSocketServer();

    server = createServer(9996, {
      createWebSocketServer: mockServer.createWebSocketServer,
    });
    await server.start();

    const ws = createMockWebSocket();
    const components = ['Button', 'Card', 'Avatar'];

    mockServer.connect(ws);
    ws.triggerMessage(JSON.stringify({ type: 'ready' }));
    await server.waitForConnection(2000);

    const listPromise = server.getComponentList();
    await delay(0);

    expect(ws.sent.map((m) => JSON.parse(m))).toContainEqual({ type: 'list' });

    ws.triggerMessage(JSON.stringify({ type: 'components', components }));
    await expect(listPromise).resolves.toEqual(components);
  });

  test('mountComponent sends mount request', async () => {
    const mockServer = createMockWebSocketServer();

    server = createServer(9995, {
      createWebSocketServer: mockServer.createWebSocketServer,
    });
    await server.start();

    const ws = createMockWebSocket();
    mockServer.connect(ws);
    ws.triggerMessage(JSON.stringify({ type: 'ready' }));
    await server.waitForConnection(2000);

    const mountPromise = server.mountComponent('TestButton');
    await delay(0);

    expect(ws.sent.map((m) => JSON.parse(m))).toContainEqual({
      type: 'mount',
      component: 'TestButton',
    });

    ws.triggerMessage(
      JSON.stringify({ type: 'mounted', component: 'TestButton' }),
    );
    await expect(mountPromise).resolves.toBeUndefined();
  });

  test('unmountComponent sends unmount request', async () => {
    const mockServer = createMockWebSocketServer();

    server = createServer(9994, {
      createWebSocketServer: mockServer.createWebSocketServer,
    });
    await server.start();

    const ws = createMockWebSocket();
    mockServer.connect(ws);
    ws.triggerMessage(JSON.stringify({ type: 'ready' }));
    await server.waitForConnection(2000);

    const unmountPromise = server.unmountComponent();
    await delay(0);

    expect(ws.sent.map((m) => JSON.parse(m))).toContainEqual({
      type: 'unmount',
    });

    ws.triggerMessage(JSON.stringify({ type: 'unmounted' }));
    await expect(unmountPromise).resolves.toBeUndefined();
  });

  test('mountComponent rejects when client disconnects mid-mount', async () => {
    const mockServer = createMockWebSocketServer();

    server = createServer(9993, {
      createWebSocketServer: mockServer.createWebSocketServer,
    });
    await server.start();

    const ws = createMockWebSocket();
    mockServer.connect(ws);
    ws.triggerMessage(JSON.stringify({ type: 'ready' }));
    await server.waitForConnection(2000);

    const mountPromise = server.mountComponent('TestButton');
    await delay(0);

    ws.triggerClose();
    await expect(mountPromise).rejects.toThrow('Client disconnected');
  });

  test('re-sends config after client reconnects', async () => {
    const mockServer = createMockWebSocketServer();

    server = createServer(9991, {
      createWebSocketServer: mockServer.createWebSocketServer,
    });
    await server.start();

    const ws1 = createMockWebSocket();
    mockServer.connect(ws1);
    ws1.triggerMessage(JSON.stringify({ type: 'ready' }));
    await server.waitForConnection(2000);

    server.sendConfig({ defaultWaitMs: 123 });

    ws1.triggerClose();

    const ws2 = createMockWebSocket();
    mockServer.connect(ws2);
    ws2.triggerMessage(JSON.stringify({ type: 'ready' }));
    await server.waitForConnection(2000);

    expect(ws2.sent.map((m) => JSON.parse(m))).toContainEqual({
      type: 'configure',
      defaultWaitMs: 123,
    });
  });
});
