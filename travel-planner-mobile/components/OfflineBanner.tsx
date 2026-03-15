import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

const BANNER_MESSAGE = "You're offline — showing cached data";

interface OfflineBannerProps {
  visible: boolean;
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{BANNER_MESSAGE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: theme.colors.warning,
    paddingVertical: theme.radius.sm,
    paddingHorizontal: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: theme.fonts.regular,
    fontWeight: '600',
    color: theme.colors.background,
  },
});
