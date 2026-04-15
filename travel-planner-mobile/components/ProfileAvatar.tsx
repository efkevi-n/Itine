import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface ProfileAvatarProps {
  photoUrl: string | null;
  name?: string;
  onPress: () => void;
  uploadLoading: boolean;
}

function getInitials(name?: string): string {
  const raw = (name ?? '').trim();
  if (!raw) return 'TR';
  const parts = raw.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'T';
  const second = (parts[1]?.[0] ?? parts[0]?.[1] ?? 'R') as string;
  return `${first}${second}`.toUpperCase();
}

export function ProfileAvatar({ photoUrl, name, onPress, uploadLoading }: ProfileAvatarProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} disabled={uploadLoading}>
      <View style={styles.wrapper}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.placeholder} accessibilityLabel="Profile initials">
            <Text style={styles.initials}>{getInitials(name)}</Text>
          </View>
        )}
        {uploadLoading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={theme.colors.text} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', marginBottom: 24 },
  wrapper: { position: 'relative', width: 132, height: 132 },
  avatar: { width: 132, height: 132, borderRadius: 66 },
  placeholder: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { color: theme.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 66,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
