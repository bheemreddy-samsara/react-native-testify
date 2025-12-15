import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { IdleScreen } from './IdleScreen';
import {
  type TestifyMessage,
  type Platform as TestifyPlatform,
  createConnection,
} from './connection';
import { waitForRenderComplete } from './idleDetection';
import type { ProviderConfig, Registry, ResolvedComponent } from './registry';

export interface IdleDetectionConfig {
  enabled?: boolean;
  timeoutMs?: number;
  debounceMs?: number;
}

interface TestifyAppProps {
  registry: Registry;
  port?: number;
  platform?: TestifyPlatform;
  idleDetection?: IdleDetectionConfig;
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
  idleDetection = {},
}: TestifyAppProps) {
  // Auto-detect platform if not provided
  const detectedPlatform: TestifyPlatform =
    platform || (Platform.OS === 'ios' ? 'ios' : 'android');

  // Idle detection config - can be updated via CLI configure message
  const [idleConfig, setIdleConfig] = useState({
    enabled: idleDetection.enabled ?? true,
    timeoutMs: idleDetection.timeoutMs ?? 5000,
    debounceMs: idleDetection.debounceMs ?? 100,
  });

  const [mountState, setMountState] = useState<MountState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');
  const connectionRef = useRef(createConnection(port, detectedPlatform));
  const messageHandlerRef = useRef<(message: TestifyMessage) => void>();

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

        // Use idle detection or fall back to fixed wait time
        if (idleConfig.enabled) {
          await waitForRenderComplete({
            timeoutMs: idleConfig.timeoutMs,
            debounceMs: idleConfig.debounceMs,
          });
        } else {
          // Fall back to fixed wait time
          await new Promise((resolve) => setTimeout(resolve, resolved.waitMs));
        }

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
    [registry, idleConfig.enabled, idleConfig.timeoutMs, idleConfig.debounceMs],
  );

  // Keep message handler in ref to avoid reconnection on config changes
  messageHandlerRef.current = useCallback(
    (message: TestifyMessage) => {
      switch (message.type) {
        case 'configure':
          if (message.idleDetection) {
            setIdleConfig({
              enabled: message.idleDetection.enabled,
              timeoutMs: message.idleDetection.timeoutMs,
              debounceMs: message.idleDetection.debounceMs,
            });
          }
          break;

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

  // Connection effect - stable, doesn't depend on handler
  useEffect(() => {
    const connection = connectionRef.current;

    connection.onMessage((message) => {
      messageHandlerRef.current?.(message);
    });
    connection.onStatusChange?.((status) => {
      setConnectionStatus(status);
    });
    connection.connect();

    return () => {
      connection.disconnect();
    };
  }, []);

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

  // Get providers and wrap component
  const providers = registry.getProviders();
  const Wrapper = registry.getWrapper();
  const storeFactory = registry.getStoreFactory();
  const shouldIsolate = registry.shouldIsolateStore(mountState.name);

  // Create fresh store if isolation is needed. We intentionally include
  // mountState.name to ensure a new store when switching between components
  // that both request isolation, even though the linter considers it unnecessary.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mountState.name needed for store refresh
  const store = useMemo(() => {
    if (shouldIsolate && storeFactory) {
      return storeFactory();
    }
    return null;
  }, [shouldIsolate, storeFactory, mountState.name]);

  // Build provider tree
  const wrapWithProviders = useCallback(
    (child: ReactNode): ReactNode => {
      return providers.reduceRight(
        (acc: ReactNode, provider: ProviderConfig, index: number) => {
          const Provider = provider.component;
          const props = provider.props || {};
          // If store isolation is active and this provider accepts a store prop, inject it
          const providerProps =
            store && 'store' in props ? { ...props, store } : props;
          // Use component displayName/name with index suffix to avoid key collisions
          const baseName = Provider.displayName || Provider.name || 'provider';
          const key = `${baseName}-${index}`;
          return (
            <Provider key={key} {...providerProps}>
              {acc}
            </Provider>
          );
        },
        child,
      );
    },
    [providers, store],
  );

  // Render component content
  const componentContent = <mountState.component.render />;

  // Apply providers
  const withProviders =
    providers.length > 0
      ? wrapWithProviders(componentContent)
      : componentContent;

  // Apply wrapper
  const content = (
    <View style={styles.container}>
      {Wrapper ? Wrapper(withProviders) : withProviders}
    </View>
  );

  return content;
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
