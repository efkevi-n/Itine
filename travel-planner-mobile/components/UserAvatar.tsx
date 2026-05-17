import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { resolveMediaUrl } from '@/api/client';

const GREEN = '#10B981';

function getInitials(name?: string): string {
  const raw = (name ?? '').trim();
  if (!raw) return 'TR';
  const parts = raw.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'T';
  const second = (parts[1]?.[0] ?? parts[0]?.[1] ?? 'R') as string;
  return `${first}${second}`.toUpperCase();
}

interface UserAvatarProps {
  photoUrl?: string | null;
  name?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function UserAvatar({ photoUrl, name, size = 40, style }: UserAvatarProps) {
  const radius = size / 2;
  const raw = photoUrl?.trim();
  const uri = raw ? resolveMediaUrl(raw) : '';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: radius }, style]}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontWeight: '700', color: GREEN },
});
