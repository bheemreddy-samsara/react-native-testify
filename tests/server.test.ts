import { afterEach, describe, expect, test } from 'bun:test';
import { createServer } from '../cli/server';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('createServer', () => {
  let server: ReturnType<typeof createServer> | null = null;

  afterEach(async () => {
    server?.stop();
    server = null;
    await delay(50); // Allow port to be released
  });

  test('starts server on specified port', async () => {
    server = createServer(9999);
    await server.start();

    const ws = new WebSocket('ws://localhost:9999');

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        ws.close();
        resolve();
      };
      ws.onerror = reject;
      setTimeout(() => reject(new Error('Connection timeout')), 2000);
    });
  });

  test('waitForConnection times out when no client connects', async () => {
    server = createServer(9998);
    await server.start();

    await expect(server.waitForConnection(100)).rejects.toThrow('Timeout');
  });

  test('handles client connection and ready message', async () => {
    server = createServer(9997);
    await server.start();

    const ws = new WebSocket('ws://localhost:9997');

    // Set up message handler before opening
    const connected = new Promise<void>((resolve) => {
      ws.onopen = () => {
        // Small delay to ensure server registers connection
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'ready' }));
          resolve();
        }, 10);
      };
    });

    await connected;
    await server.waitForConnection(2000);
    ws.close();
  });

  test('getComponentList sends list request and receives response', async () => {
    server = createServer(9996);
    await server.start();

    const ws = new WebSocket('ws://localhost:9996');
    const components = ['Button', 'Card', 'Avatar'];

    const ready = new Promise<void>((resolve) => {
      ws.onopen = () => {
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'ready' }));
          resolve();
        }, 10);
      };
    });

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string);
      if (data.type === 'list') {
        ws.send(JSON.stringify({ type: 'components', components }));
      }
    };

    await ready;
    await server.waitForConnection(2000);
    const result = await server.getComponentList();

    expect(result).toEqual(components);
    ws.close();
  });

  test('mountComponent sends mount request', async () => {
    server = createServer(9995);
    await server.start();

    const ws = new WebSocket('ws://localhost:9995');
    let receivedMount = false;
    let mountedComponent = '';

    const ready = new Promise<void>((resolve) => {
      ws.onopen = () => {
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'ready' }));
          resolve();
        }, 10);
      };
    });

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string);
      if (data.type === 'mount') {
        receivedMount = true;
        mountedComponent = data.component;
        ws.send(JSON.stringify({ type: 'mounted', component: data.component }));
      }
    };

    await ready;
    await server.waitForConnection(2000);
    await server.mountComponent('TestButton');

    expect(receivedMount).toBe(true);
    expect(mountedComponent).toBe('TestButton');
    ws.close();
  });

  test('unmountComponent sends unmount request', async () => {
    server = createServer(9994);
    await server.start();

    const ws = new WebSocket('ws://localhost:9994');
    let receivedUnmount = false;

    const ready = new Promise<void>((resolve) => {
      ws.onopen = () => {
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'ready' }));
          resolve();
        }, 10);
      };
    });

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string);
      if (data.type === 'unmount') {
        receivedUnmount = true;
        ws.send(JSON.stringify({ type: 'unmounted' }));
      }
    };

    await ready;
    await server.waitForConnection(2000);
    await server.unmountComponent();

    expect(receivedUnmount).toBe(true);
    ws.close();
  });

  test('mountComponent rejects when client disconnects mid-mount', async () => {
    server = createServer(9993);
    await server.start();

    const ws = new WebSocket('ws://localhost:9993');

    const ready = new Promise<void>((resolve) => {
      ws.onopen = () => {
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'ready' }));
          resolve();
        }, 10);
      };
    });

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string);
      if (data.type === 'mount') {
        ws.close();
      }
    };

    await ready;
    await server.waitForConnection(2000);
    await expect(server.mountComponent('TestButton')).rejects.toThrow(
      'Client disconnected',
    );
  });

  test('waitForConnection waits for ready after reconnect', async () => {
    server = createServer(9992);
    await server.start();

    const ws1 = new WebSocket('ws://localhost:9992');
    await new Promise<void>((resolve) => {
      ws1.onopen = () => {
        setTimeout(() => {
          ws1.send(JSON.stringify({ type: 'ready' }));
          resolve();
        }, 10);
      };
    });

    await server.waitForConnection(2000);
    ws1.close();
    await delay(50);

    const ws2 = new WebSocket('ws://localhost:9992');
    const readyPromise = server.waitForConnection(2000);

    await new Promise<void>((resolve) => {
      ws2.onopen = () => {
        setTimeout(() => {
          ws2.send(JSON.stringify({ type: 'ready' }));
          resolve();
        }, 10);
      };
    });

    await readyPromise;
    ws2.close();
  });

  test('re-sends config after client reconnects', async () => {
    server = createServer(9991);
    await server.start();

    const ws1 = new WebSocket('ws://localhost:9991');
    await new Promise<void>((resolve) => {
      ws1.onopen = () => {
        setTimeout(() => {
          ws1.send(JSON.stringify({ type: 'ready' }));
          resolve();
        }, 10);
      };
    });

    await server.waitForConnection(2000);
    server.sendConfig({ defaultWaitMs: 123 });

    ws1.close();
    await delay(50);

    const ws2 = new WebSocket('ws://localhost:9991');
    const receivedConfig = new Promise<number>((resolve) => {
      ws2.onmessage = (event) => {
        const data = JSON.parse(event.data as string);
        if (data.type === 'configure') {
          resolve(data.defaultWaitMs as number);
        }
      };
    });

    await new Promise<void>((resolve) => {
      ws2.onopen = () => {
        setTimeout(() => {
          ws2.send(JSON.stringify({ type: 'ready' }));
          resolve();
        }, 10);
      };
    });

    await expect(receivedConfig).resolves.toBe(123);
    ws2.close();
  });
});
