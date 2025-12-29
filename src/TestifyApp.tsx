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
import type {
  ProviderConfig,
  Registry,
  ResolvedComponent,
  WrapperComponent,
} from './registry';
import {
  type TextInputStabilizerConfig,
  applyTextInputStabilizer,
} from './stabilizers/textInput';

export interface IdleDetectionConfig {
  enabled?: boolean;
  timeoutMs?: number;
  debounceMs?: number;
}

export interface StabilizersConfig {
  textInput?: boolean | TextInputStabilizerConfig;
}

interface TestifyAppProps {
  registry: Registry;
  port?: number;
  platform?: TestifyPlatform;
  idleDetection?: IdleDetectionConfig;
  stabilizers?: StabilizersConfig;
  /** Providers to wrap all components (overrides registry providers) */
  providers?: ProviderConfig[];
  /** Wrapper component for all components (overrides registry wrapper) */
  wrapper?: WrapperComponent;
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
  stabilizers,
  providers: propProviders,
  wrapper: propWrapper,
}: TestifyAppProps) {
  if (stabilizers?.textInput) {
    applyTextInputStabilizer(
      stabilizers.textInput === true ? {} : stabilizers.textInput,
    );
  }

  // Auto-detect platform if not provided
  const detectedPlatform: TestifyPlatform =
    platform || (Platform.OS === 'ios' ? 'ios' : 'android');

  // Idle detection config - can be updated via CLI configure message
  const [idleConfig, setIdleConfig] = useState({
    enabled: idleDetection.enabled ?? true,
    timeoutMs: idleDetection.timeoutMs ?? 5000,
    debounceMs: idleDetection.debounceMs ?? 100,
  });

  const [defaultWaitMsOverride, setDefaultWaitMsOverride] = useState<
    number | undefined
  >();

  const [mountState, setMountState] = useState<MountState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');
  const connectionRef = useRef(createConnection(port, detectedPlatform));
  const messageHandlerRef = useRef<((message: TestifyMessage) => void) | null>(
    null,
  );

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

        let waitMsUsed = 0;

        // Use idle detection or fall back to fixed wait time
        if (idleConfig.enabled) {
          await waitForRenderComplete({
            timeoutMs: idleConfig.timeoutMs,
            debounceMs: idleConfig.debounceMs,
          });
        } else {
          const shouldOverrideDefaultWait =
            resolved.usesDefaultWaitMs &&
            registry.options.defaultWaitMs === undefined &&
            typeof defaultWaitMsOverride === 'number';

          const waitMs = shouldOverrideDefaultWait
            ? defaultWaitMsOverride
            : resolved.waitMs;

          waitMsUsed = waitMs;

          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        setMountState((prev) => (prev ? { ...prev, status: 'ready' } : null));

        connectionRef.current.send({
          type: 'mounted',
          component: componentName,
          waitMs: waitMsUsed,
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
    [
      registry,
      idleConfig.enabled,
      idleConfig.timeoutMs,
      idleConfig.debounceMs,
      defaultWaitMsOverride,
    ],
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
          if (typeof message.defaultWaitMs === 'number') {
            setDefaultWaitMsOverride(message.defaultWaitMs);
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

  // Get providers and wrap component (must be before early returns to satisfy hooks rules)
  // Props override registry options for cleaner auto-discovery pattern
  const providers = propProviders ?? registry.getProviders();
  const Wrapper = propWrapper ?? registry.getWrapper();
  const storeFactory = registry.getStoreFactory();
  const shouldIsolate = mountState
    ? registry.shouldIsolateStore(mountState.name)
    : false;

  // Create fresh store if isolation is needed. We intentionally include
  // mountState?.name to ensure a new store when switching between components
  // that both request isolation, even though the linter considers it unnecessary.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mountState.name needed for store refresh
  const store = useMemo(() => {
    if (shouldIsolate && storeFactory) {
      return storeFactory();
    }
    return null;
  }, [shouldIsolate, storeFactory, mountState?.name]);

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
