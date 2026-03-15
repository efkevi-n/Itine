import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import type { Toast as ToastItem } from '@/types/loading';
import { dismissToast } from '@/utils/toastStore';
import { theme } from '@/constants/theme';

const TOAST_ICONS: Record<ToastItem['type'], string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss(toast.id));
  };

  const bgColor = toast.type === 'success' ? theme.colors.success
    : toast.type === 'error' ? theme.colors.error
    : toast.type === 'warning' ? theme.colors.warning
    : theme.colors.primary;

  return (
    <Animated.View style={[styles.wrapper, { backgroundColor: bgColor }, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.icon}>{TOAST_ICONS[toast.type]}</Text>
      <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
      <TouchableOpacity onPress={handleDismiss} hitSlop={HIT_SLOP} style={styles.dismissBtn}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.radius.sm,
    paddingHorizontal: theme.radius.md,
    borderRadius: theme.radius.sm,
    marginHorizontal: theme.radius.md,
    marginBottom: theme.radius.sm,
    minHeight: 44,
  },
  icon: {
    fontSize: theme.fonts.large,
    color: theme.colors.text,
    marginRight: theme.radius.sm,
  },
  message: {
    flex: 1,
    fontSize: theme.fonts.regular,
    color: theme.colors.text,
    fontWeight: '500',
  },
  dismissBtn: {
    padding: theme.radius.sm,
  },
  dismissText: {
    fontSize: theme.fonts.regular,
    color: theme.colors.text,
  },
});
