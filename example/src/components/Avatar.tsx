import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'small' | 'medium' | 'large';
}

const sizes = {
  small: 32,
  medium: 48,
  large: 72,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({name, imageUrl, size = 'medium'}: AvatarProps) {
  const dimension = sizes[size];

  if (imageUrl) {
    return (
      <Image
        source={{uri: imageUrl}}
        style={[
          styles.image,
          {width: dimension, height: dimension, borderRadius: dimension / 2},
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {width: dimension, height: dimension, borderRadius: dimension / 2},
      ]}>
      <Text style={[styles.initials, {fontSize: dimension * 0.4}]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#e0e0e0',
  },
  placeholder: {
    backgroundColor: '#5856D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '600',
  },
});
