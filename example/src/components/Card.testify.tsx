import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Button } from './Button';
import { Avatar } from './Avatar';
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacer: {
    width: 12,
  },
});

export default {
  'Card/Simple': {
    render: () => (
      <Centered>
        <Card title="Simple Card" />
      </Centered>
    ),
  },
  'Card/WithSubtitle': {
    render: () => (
      <Centered>
        <Card title="Card Title" subtitle="This is a helpful subtitle" />
      </Centered>
    ),
  },
  'Card/WithButton': {
    render: () => (
      <Centered>
        <Card title="Interactive Card" subtitle="Contains an action button">
          <Button title="Take Action" variant="primary" />
        </Card>
      </Centered>
    ),
  },
  // Composite component with multiple children
  'Card/WithBadgeAndAvatar': {
    render: () => (
      <Centered>
        <Card title="User Profile" subtitle="Team Member">
          <View style={styles.row}>
            <Avatar name="Alice Johnson" size="medium" />
            <View style={styles.spacer} />
            <Badge label="Active" variant="success" />
          </View>
        </Card>
      </Centered>
    ),
  },
  // Example with custom waitMs (longer wait for animations)
  'Card/Animated': {
    render: () => (
      <Centered>
        <Card title="Animated Card" subtitle="Custom wait time" />
      </Centered>
    ),
    waitMs: 500,
  },
};
