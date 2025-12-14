import React from 'react';
import {View, StyleSheet} from 'react-native';
import {createRegistry} from 'react-native-testify';
import {Button, Card, Avatar, Badge} from '../src/components';

const Centered = ({children}: {children: React.ReactNode}) => (
  <View style={styles.centered}>{children}</View>
);

export default createRegistry(
  {
    // Button variants
    Button_Primary: () => (
      <Centered>
        <Button title="Primary Button" variant="primary" />
      </Centered>
    ),

    Button_Secondary: () => (
      <Centered>
        <Button title="Secondary Button" variant="secondary" />
      </Centered>
    ),

    Button_Danger: () => (
      <Centered>
        <Button title="Delete" variant="danger" />
      </Centered>
    ),

    Button_Disabled: () => (
      <Centered>
        <Button title="Disabled" variant="primary" disabled />
      </Centered>
    ),

    // Card variants
    Card_Simple: () => (
      <Centered>
        <Card title="Simple Card" />
      </Centered>
    ),

    Card_WithSubtitle: () => (
      <Centered>
        <Card title="Card Title" subtitle="This is a helpful subtitle" />
      </Centered>
    ),

    Card_WithButton: () => (
      <Centered>
        <Card title="Interactive Card" subtitle="Contains an action button">
          <Button title="Take Action" variant="primary" />
        </Card>
      </Centered>
    ),

    // Avatar variants
    Avatar_Small: () => (
      <Centered>
        <Avatar name="John Doe" size="small" />
      </Centered>
    ),

    Avatar_Medium: () => (
      <Centered>
        <Avatar name="Jane Smith" size="medium" />
      </Centered>
    ),

    Avatar_Large: () => (
      <Centered>
        <Avatar name="Bob Wilson" size="large" />
      </Centered>
    ),

    // Badge variants
    Badge_Success: () => (
      <Centered>
        <Badge label="Success" variant="success" />
      </Centered>
    ),

    Badge_Warning: () => (
      <Centered>
        <Badge label="Warning" variant="warning" />
      </Centered>
    ),

    Badge_Error: () => (
      <Centered>
        <Badge label="Error" variant="error" />
      </Centered>
    ),

    Badge_Info: () => (
      <Centered>
        <Badge label="Info" variant="info" />
      </Centered>
    ),

    // Composite components
    Card_WithBadgeAndAvatar: () => (
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
  {
    defaultWaitMs: 300,
  },
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
