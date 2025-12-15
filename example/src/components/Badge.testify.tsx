import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Badge } from './Badge';

const Centered = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.centered}>{children}</View>
);

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
});

export default {
  'Badge/Success': {
    render: () => (
      <Centered>
        <Badge label="Success" variant="success" />
      </Centered>
    ),
  },
  'Badge/Warning': {
    render: () => (
      <Centered>
        <Badge label="Warning" variant="warning" />
      </Centered>
    ),
  },
  'Badge/Error': {
    render: () => (
      <Centered>
        <Badge label="Error" variant="error" />
      </Centered>
    ),
  },
  'Badge/Info': {
    render: () => (
      <Centered>
        <Badge label="Info" variant="info" />
      </Centered>
    ),
  },
};
