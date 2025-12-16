import React from 'react';
import {View, Text, StyleSheet, type ReactNode} from 'react-native';
import {useTheme} from '../context';

interface CardProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function Card({title, subtitle, children}: CardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, {backgroundColor: theme.colors.surface}]}>
      <Text style={[styles.title, {color: theme.colors.text}]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
          {subtitle}
        </Text>
      )}
      {children && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minWidth: 280,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  content: {
    marginTop: 12,
  },
});
