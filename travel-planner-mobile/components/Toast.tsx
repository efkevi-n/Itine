import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
  duration?: number;
  onDismiss?: () => void;
}

const TYPE_CONFIG = {
  success: {
    color: '#22c55e',
    icon: 'check-circle' as const,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  error: {
    color: '#f87171',
    icon: 'x-circle' as const,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  warning: {
    color: '#f59e0b',
    icon: 'alert-circle' as const,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  info: {
    color: '#6366f1',
    icon: 'info' as const,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
};

export function Toast({
  message,
  type,
  visible,
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onDismiss?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    } else {
      slideAnim.setValue(-100);
    }
  }, [visible, duration, slideAnim, onDismiss]);

  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: config.backgroundColor,
            borderColor: config.borderColor,
          },
        ]}
      >
        <Feather
          name={config.icon}
          size={20}
          color={config.color}
          style={styles.icon}
        />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    padding: 16,
    paddingTop: 32,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131f',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
