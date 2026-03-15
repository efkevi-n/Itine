import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ServiceIcon } from './ServiceIcon';
import { theme } from '@/constants/theme';
import type { ActiveServiceItem } from '@/types/activeTrip';

interface NextServiceBannerProps {
  service: ActiveServiceItem | null;
  countdownLabel: string;
}

export function NextServiceBanner({ service, countdownLabel }: NextServiceBannerProps) {
  if (!service) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No upcoming services today</Text>
      </View>
    );
  }
  const typeLabel = service.serviceType.charAt(0).toUpperCase() + service.serviceType.slice(1);
  return (
    <View style={styles.container}>
      <ServiceIcon serviceType={service.serviceType} />
      <View style={styles.content}>
        <Text style={styles.title}>{typeLabel} — {service.providerName}</Text>
        {countdownLabel ? <Text style={styles.countdown}>{countdownLabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: theme.radius.md,
    marginBottom: theme.radius.md,
    gap: 12,
  },
  content: { flex: 1 },
  title: {
    fontSize: theme.fonts.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  countdown: {
    fontSize: theme.fonts.regular,
    color: theme.colors.text,
    opacity: 0.9,
    marginTop: 2,
  },
  text: {
    fontSize: theme.fonts.regular,
    color: theme.colors.text,
  },
});
