import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';

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
  'Avatar/Small': {
    render: () => (
      <Centered>
        <Avatar name="John Doe" size="small" />
      </Centered>
    ),
  },
  'Avatar/Medium': {
    render: () => (
      <Centered>
        <Avatar name="Jane Smith" size="medium" />
      </Centered>
    ),
  },
  'Avatar/Large': {
    render: () => (
      <Centered>
        <Avatar name="Bob Wilson" size="large" />
      </Centered>
    ),
  },
};
