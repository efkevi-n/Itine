import React from 'react';
import { Text, StyleSheet } from 'react-native';

const SERVICE_EMOJI: Record<string, string> = {
  flight: '✈️',
  hotel: '🏨',
  accommodation: '🏨',
  transport: '🚕',
  activity: '🎭',
  activities: '🎭',
};

interface ServiceIconProps {
  serviceType: string;
}

export function ServiceIcon({ serviceType }: ServiceIconProps) {
  const key = (serviceType || '').toLowerCase().trim();
  const emoji = SERVICE_EMOJI[key] ?? '📦';
  return <Text style={styles.emoji}>{emoji}</Text>;
}

const styles = StyleSheet.create({
  emoji: { fontSize: 28 },
});
