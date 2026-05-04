import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/utils/toastStore';
import { dismissToast } from '@/utils/toastStore';
import { Toast } from '@/components/Toast';

const TOP_OFFSET = Platform.OS === 'ios' ? 0 : 24;

export function ToastContainer() {
  const toasts = useToastStore();
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const ids = new Set(toasts.map((t) => t.id));
    toasts.forEach((t) => {
      if (timeouts.current.has(t.id)) return;
      const id = setTimeout(() => {
        dismissToast(t.id);
        timeouts.current.delete(t.id);
      }, t.duration);
      timeouts.current.set(t.id, id);
    });
    timeouts.current.forEach((id, toastId) => {
      if (!ids.has(toastId)) {
        clearTimeout(id);
        timeouts.current.delete(toastId);
      }
    });
    return () => {
      timeouts.current.forEach((id) => clearTimeout(id));
      timeouts.current.clear();
    };
  }, [toasts]);

  const insets = useSafeAreaInsets();
  const top = insets.top + TOP_OFFSET;

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top }]} pointerEvents="box-none">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          visible
          message={t.message}
          type={t.type}
          duration={t.duration}
          onDismiss={() => dismissToast(t.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
