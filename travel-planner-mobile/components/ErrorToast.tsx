import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} hitSlop={HIT_SLOP}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 16,
  },
  message: {
    flex: 1,
    fontSize: theme.fonts.regular,
    color: theme.colors.error,
  },
  dismissBtn: {
    paddingLeft: 12,
  },
  dismissText: {
    fontSize: theme.fonts.medium,
    color: theme.colors.text,
  },
});
