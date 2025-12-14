type MessageHandler = (message: TestifyMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface TestifyMessage {
  type: 'mount' | 'unmount' | 'list' | 'ping';
  component?: string;
}

export interface TestifyConnection {
  connect(): void;
  disconnect(): void;
  onMessage(handler: MessageHandler): void;
  onStatusChange?(handler: StatusHandler): void;
  send(data: object): void;
  isConnected(): boolean;
}

export function createConnection(port: number): TestifyConnection {
  let ws: WebSocket | null = null;
  let messageHandler: MessageHandler | null = null;
  let statusHandler: StatusHandler | null = null;
  let connected = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const setStatus = (status: ConnectionStatus) => {
    if (statusHandler) {
      statusHandler(status);
    }
  };

  const connect = () => {
    if (ws) {
      ws.close();
    }

    setStatus('connecting');

    try {
      ws = new WebSocket(`ws://localhost:${port}`);

      ws.onopen = () => {
        connected = true;
        setStatus('connected');
        console.log('[Testify] Connected to CLI');
        send({ type: 'ready' });
      };

      ws.onclose = () => {
        connected = false;
        setStatus('disconnected');
        console.log('[Testify] Disconnected from CLI');
        scheduleReconnect();
      };

      ws.onerror = () => {
        connected = false;
        setStatus('disconnected');
        scheduleReconnect();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as TestifyMessage;
          if (messageHandler) {
            messageHandler(data);
          }
        } catch (e) {
          console.error('[Testify] Failed to parse message:', e);
        }
      };
    } catch (e) {
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    reconnectTimer = setTimeout(() => {
      console.log('[Testify] Attempting to reconnect...');
      connect();
    }, 2000);
  };

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    connected = false;
  };

  const onMessage = (handler: MessageHandler) => {
    messageHandler = handler;
  };

  const onStatusChange = (handler: StatusHandler) => {
    statusHandler = handler;
  };

  const send = (data: object) => {
    if (ws && connected) {
      ws.send(JSON.stringify(data));
    }
  };

  const isConnected = () => connected;

  return {
    connect,
    disconnect,
    onMessage,
    onStatusChange,
    send,
    isConnected,
  };
}
