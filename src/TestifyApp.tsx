import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { IdleScreen } from './IdleScreen';
import {
  type TestifyMessage,
  type Platform as TestifyPlatform,
  createConnection,
} from './connection';
import type { Registry, ResolvedComponent } from './registry';

interface TestifyAppProps {
  registry: Registry;
  port?: number;
  platform?: TestifyPlatform;
}

interface MountState {
  name: string;
  component: ResolvedComponent;
  status: 'mounting' | 'ready' | 'error';
  error?: string;
}

export function TestifyApp({
  registry,
  port = 8089,
  platform,
}: TestifyAppProps) {
  // Auto-detect platform if not provided
  const detectedPlatform: TestifyPlatform =
    platform || (Platform.OS === 'ios' ? 'ios' : 'android');

  const [mountState, setMountState] = useState<MountState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');
  const connectionRef = useRef(createConnection(port, detectedPlatform));

  const handleMount = useCallback(
    async (componentName: string) => {
      const resolved = registry.get(componentName);

      if (!resolved) {
        connectionRef.current.send({
          type: 'error',
          error: `Component not found: ${componentName}`,
          availableComponents: registry.list(),
        });
        return;
      }

      setMountState({
        name: componentName,
        component: resolved,
        status: 'mounting',
      });

      try {
        // Wait for custom condition if provided
        if (resolved.waitFor) {
          await resolved.waitFor();
        }

        // Wait for render stabilization
        await new Promise((resolve) => setTimeout(resolve, resolved.waitMs));

        setMountState((prev) => (prev ? { ...prev, status: 'ready' } : null));

        connectionRef.current.send({
          type: 'mounted',
          component: componentName,
          waitMs: resolved.waitMs,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setMountState((prev) =>
          prev ? { ...prev, status: 'error', error: errorMessage } : null,
        );
        connectionRef.current.send({
          type: 'error',
          error: `Failed to mount ${componentName}: ${errorMessage}`,
        });
      }
    },
    [registry],
  );

  const handleMessage = useCallback(
    (message: TestifyMessage) => {
      switch (message.type) {
        case 'mount':
          if (message.component) {
            handleMount(message.component);
          }
          break;

        case 'unmount':
          setMountState(null);
          connectionRef.current.send({ type: 'unmounted' });
          break;

        case 'list':
          connectionRef.current.send({
            type: 'components',
            components: registry.list(),
          });
          break;

        case 'ping':
          connectionRef.current.send({ type: 'pong' });
          break;
      }
    },
    [registry, handleMount],
  );

  useEffect(() => {
    const connection = connectionRef.current;

    connection.onMessage(handleMessage);
    connection.onStatusChange?.((status) => {
      setConnectionStatus(status);
    });
    connection.connect();

    return () => {
      connection.disconnect();
    };
  }, [handleMessage]);

  // Show idle screen when no component mounted
  if (!mountState) {
    return <IdleScreen port={port} connectionStatus={connectionStatus} />;
  }

  // Show error screen
  if (mountState.status === 'error') {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{mountState.error}</Text>
      </View>
    );
  }

  // Render the component with wrapper if provided
  const Wrapper = registry.getWrapper();
  const content = (
    <View style={styles.container}>
      <mountState.component.render />
    </View>
  );

  return Wrapper ? Wrapper(content) : content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2d1b1b',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#ffaaaa',
    textAlign: 'center',
  },
});
