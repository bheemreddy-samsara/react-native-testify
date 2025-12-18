import { afterEach, describe, expect, test } from 'bun:test';
import { createServer } from '../cli/server';

type WebsocketHandler = {
  open: (ws: MockWebSocket) => void;
  message: (ws: MockWebSocket, message: unknown) => void;
  close: (ws: MockWebSocket) => void;
};

type MockWebSocket = {
  sent: string[];
  send: (msg: string) => void;
};

type BunServeOptions = {
  port: number;
  fetch: (
    req: Request,
    server: { upgrade: (req: Request) => boolean },
  ) => Response | undefined;
  websocket: WebsocketHandler;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMockBunServe() {
  let lastOptions: BunServeOptions | null = null;

  const serve = (options: BunServeOptions) => {
    lastOptions = options;
    return {
      upgrade: () => true,
      stop: () => {},
    };
  };

  return {
    serve,
    getWebsocketHandlers(): WebsocketHandler {
      if (!lastOptions) {
        throw new Error('Bun.serve was not called');
      }
      return lastOptions.websocket;
    },
  };
}

function createMockWebSocket(): MockWebSocket {
  const sent: string[] = [];
  return {
    sent,
    send: (msg: string) => {
      sent.push(msg);
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
    const { serve } = createMockBunServe();

    server = createServer(9998, { serve });
    await server.start();

    await expect(server.waitForConnection(120)).rejects.toThrow(
      'Timeout waiting for app connection',
    );
  });

  test('handles client connection and ready message', async () => {
    const { serve, getWebsocketHandlers } = createMockBunServe();

    server = createServer(9997, { serve });
    await server.start();

    const handlers = getWebsocketHandlers();
    const ws = createMockWebSocket();

    handlers.open(ws);
    handlers.message(ws, JSON.stringify({ type: 'ready' }));

    await server.waitForConnection(2000);
  });

  test('getComponentList sends list request and receives response', async () => {
    const { serve, getWebsocketHandlers } = createMockBunServe();

    server = createServer(9996, { serve });
    await server.start();

    const handlers = getWebsocketHandlers();
    const ws = createMockWebSocket();
    const components = ['Button', 'Card', 'Avatar'];

    handlers.open(ws);
    handlers.message(ws, JSON.stringify({ type: 'ready' }));
    await server.waitForConnection(2000);

    const listPromise = server.getComponentList();
    await delay(0);

    expect(ws.sent.map((m) => JSON.parse(m))).toContainEqual({ type: 'list' });

    handlers.message(ws, JSON.stringify({ type: 'components', components }));
    await expect(listPromise).resolves.toEqual(components);
  });

  test('mountComponent sends mount request', async () => {
    const { serve, getWebsocketHandlers } = createMockBunServe();

    server = createServer(9995, { serve });
    await server.start();

    const handlers = getWebsocketHandlers();
    const ws = createMockWebSocket();
    handlers.open(ws);
    handlers.message(ws, JSON.stringify({ type: 'ready' }));
    await server.waitForConnection(2000);

    const mountPromise = server.mountComponent('TestButton');
    await delay(0);

    expect(ws.sent.map((m) => JSON.parse(m))).toContainEqual({
      type: 'mount',
      component: 'TestButton',
    });

    handlers.message(
      ws,
      JSON.stringify({ type: 'mounted', component: 'TestButton' }),
    );
    await expect(mountPromise).resolves.toBeUndefined();
  });

  test('unmountComponent sends unmount request', async () => {
    const { serve, getWebsocketHandlers } = createMockBunServe();

    server = createServer(9994, { serve });
    await server.start();

    const handlers = getWebsocketHandlers();
    const ws = createMockWebSocket();
    handlers.open(ws);
    handlers.message(ws, JSON.stringify({ type: 'ready' }));
    await server.waitForConnection(2000);

    const unmountPromise = server.unmountComponent();
    await delay(0);

    expect(ws.sent.map((m) => JSON.parse(m))).toContainEqual({
      type: 'unmount',
    });

    handlers.message(ws, JSON.stringify({ type: 'unmounted' }));
    await expect(unmountPromise).resolves.toBeUndefined();
  });

  test('mountComponent rejects when client disconnects mid-mount', async () => {
    const { serve, getWebsocketHandlers } = createMockBunServe();

    server = createServer(9993, { serve });
    await server.start();

    const handlers = getWebsocketHandlers();
    const ws = createMockWebSocket();
    handlers.open(ws);
    handlers.message(ws, JSON.stringify({ type: 'ready' }));
    await server.waitForConnection(2000);

    const mountPromise = server.mountComponent('TestButton');
    await delay(0);

    handlers.close(ws);
    await expect(mountPromise).rejects.toThrow('Client disconnected');
  });

  test('re-sends config after client reconnects', async () => {
    const { serve, getWebsocketHandlers } = createMockBunServe();

    server = createServer(9991, { serve });
    await server.start();

    const handlers = getWebsocketHandlers();

    const ws1 = createMockWebSocket();
    handlers.open(ws1);
    handlers.message(ws1, JSON.stringify({ type: 'ready' }));
    await server.waitForConnection(2000);

    server.sendConfig({ defaultWaitMs: 123 });

    handlers.close(ws1);

    const ws2 = createMockWebSocket();
    handlers.open(ws2);
    handlers.message(ws2, JSON.stringify({ type: 'ready' }));
    await server.waitForConnection(2000);

    expect(ws2.sent.map((m) => JSON.parse(m))).toContainEqual({
      type: 'configure',
      defaultWaitMs: 123,
    });
  });
});
