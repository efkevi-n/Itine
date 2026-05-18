import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { useScreenInsets } from '@/hooks/useScreenInsets';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  const { top } = useScreenInsets();
  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  message: {
    marginTop: 12,
    fontSize: theme.fonts.regular,
    color: theme.colors.subtext,
  },
});
