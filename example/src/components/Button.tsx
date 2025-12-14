import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

interface ButtonProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onPress?: () => void;
}

const variantStyles: Record<string, ViewStyle> = {
  primary: {backgroundColor: '#007AFF'},
  secondary: {backgroundColor: '#5856D6'},
  danger: {backgroundColor: '#FF3B30'},
};

export function Button({
  title,
  variant = 'primary',
  disabled,
  onPress,
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, variantStyles[variant], disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.8}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
