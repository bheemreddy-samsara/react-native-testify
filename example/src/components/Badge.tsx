import React from 'react';
import {View, Text, StyleSheet, type ViewStyle} from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info';
}

const variantStyles: Record<string, ViewStyle> = {
  success: {backgroundColor: '#34C759'},
  warning: {backgroundColor: '#FF9500'},
  error: {backgroundColor: '#FF3B30'},
  info: {backgroundColor: '#007AFF'},
};

export function Badge({label, variant = 'info'}: BadgeProps) {
  return (
    <View style={[styles.badge, variantStyles[variant]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
