import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { LOADER_MESSAGE_INTERVAL_MS } from '@/constants/loader';

const GREEN = '#10B981';
const TEXT = '#111827';

interface FullScreenLoaderProps {
  visible: boolean;
  messages?: readonly string[];
  /** Spinner color — defaults to ITINE green. */
  color?: string;
}

export function FullScreenLoader({
  visible,
  messages = [],
  color = GREEN,
}: FullScreenLoaderProps) {
  const [index, setIndex] = useState(0);
  const list = messages.length > 0 ? messages : ['Loading...'];

  useEffect(() => {
    if (!visible) {
      setIndex(0);
      return;
    }
    if (list.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, LOADER_MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [visible, list.length]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.spinnerRing}>
          <ActivityIndicator size="large" color={color} />
        </View>
        <Text style={styles.message}>{list[index]}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(248, 248, 246, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  spinnerRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  message: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: '600',
    color: TEXT,
    textAlign: 'center',
    lineHeight: 22,
  },
});
