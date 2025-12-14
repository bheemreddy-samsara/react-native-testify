import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface IdleScreenProps {
  port?: number;
  connectionStatus?: ConnectionStatus;
}

const statusConfig: Record<ConnectionStatus, { text: string; color: string }> =
  {
    connecting: { text: 'Connecting...', color: '#f0a500' },
    connected: { text: 'Idle', color: '#4ecca3' },
    disconnected: { text: 'Disconnected', color: '#ff6b6b' },
  };

export function IdleScreen({
  port = 8089,
  connectionStatus = 'connecting',
}: IdleScreenProps) {
  const { text, color } = statusConfig[connectionStatus];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Testify</Text>
      <Text style={[styles.status, { color }]}>{text}</Text>
      <Text style={styles.info}>
        {connectionStatus === 'connected'
          ? `Waiting for commands on port ${port}`
          : `Attempting to connect on port ${port}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 16,
  },
  status: {
    fontSize: 24,
    marginBottom: 24,
  },
  info: {
    fontSize: 14,
    color: '#888',
  },
});
