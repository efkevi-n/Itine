import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { ServiceIcon } from './ServiceIcon';
import { theme } from '@/constants/theme';
import { MAPS_QUERY_URL } from '@/constants/activeTrip';
import type { ActiveServiceItem } from '@/types/activeTrip';

const STATUS_LABELS: Record<ActiveServiceItem['statusDisplay'], string> = {
  used: '✅ Used',
  upcoming: '⏳ Upcoming',
  not_yet_active: '🔒 Not yet active',
};

interface ActiveServiceRowProps {
  item: ActiveServiceItem;
}

export function ActiveServiceRow({ item }: ActiveServiceRowProps) {
  const typeLabel = item.serviceType.charAt(0).toUpperCase() + item.serviceType.slice(1);
  const onPressMaps = item.locationAddress
    ? () => Linking.openURL(MAPS_QUERY_URL + encodeURIComponent(item.locationAddress!))
    : undefined;

  return (
    <View style={styles.container}>
      <ServiceIcon serviceType={item.serviceType} />
      <View style={styles.content}>
        <Text style={styles.type}>{typeLabel}</Text>
        <Text style={styles.provider}>{item.providerName}</Text>
        {item.timeLabel ? <Text style={styles.time}>{item.timeLabel}</Text> : null}
        <Text style={styles.status}>{STATUS_LABELS[item.statusDisplay]}</Text>
        {onPressMaps ? (
          <TouchableOpacity onPress={onPressMaps} style={styles.mapsBtn}>
            <Text style={styles.mapsText}>View on Maps</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.radius.md,
    marginBottom: theme.radius.sm,
    gap: 12,
  },
  content: { flex: 1 },
  type: { fontSize: theme.fonts.medium, fontWeight: 'bold', color: theme.colors.text },
  provider: { fontSize: theme.fonts.regular, color: theme.colors.subtext, marginTop: 2 },
  time: { fontSize: theme.fonts.regular, color: theme.colors.subtext, marginTop: 2 },
  status: { fontSize: theme.fonts.regular, color: theme.colors.success, marginTop: 4 },
  mapsBtn: { marginTop: 8 },
  mapsText: { fontSize: theme.fonts.regular, color: theme.colors.primary },
});
