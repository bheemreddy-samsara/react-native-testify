import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from './Button';

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
  'Button/Primary': {
    render: () => (
      <Centered>
        <Button title="Primary Button" variant="primary" />
      </Centered>
    ),
  },
  'Button/Secondary': {
    render: () => (
      <Centered>
        <Button title="Secondary Button" variant="secondary" />
      </Centered>
    ),
  },
  'Button/Danger': {
    render: () => (
      <Centered>
        <Button title="Delete" variant="danger" />
      </Centered>
    ),
  },
  'Button/Disabled': {
    render: () => (
      <Centered>
        <Button title="Disabled" variant="primary" disabled />
      </Centered>
    ),
  },
};
