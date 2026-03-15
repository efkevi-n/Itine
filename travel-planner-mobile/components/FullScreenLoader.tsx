import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';
import { LOADER_MESSAGE_INTERVAL_MS } from '@/constants/loader';

interface FullScreenLoaderProps {
  visible: boolean;
  messages?: readonly string[];
}

export function FullScreenLoader({ visible, messages = [] }: FullScreenLoaderProps) {
  const [index, setIndex] = useState(0);
  const list = messages.length > 0 ? messages : ['Loading...'];

  useEffect(() => {
    if (!visible || list.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, LOADER_MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [visible, list.length]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.message}>{list[index]}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
  },
  message: {
    marginTop: theme.radius.lg,
    fontSize: theme.fonts.medium,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
