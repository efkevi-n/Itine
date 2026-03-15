import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TripDetailView } from '@/types/trip';
import { getStatusColor } from '@/utils/tripStatus';
import { formatTripDateRange } from '@/utils/dateFormat';

interface TripHeaderProps {
  trip: TripDetailView;
}

export function TripHeader({ trip }: TripHeaderProps) {
  const statusColor = getStatusColor(trip.status);
  const displayStatus = trip.status ? trip.status.charAt(0) + trip.status.slice(1).toLowerCase() : '';
  const dateRange = formatTripDateRange(trip.startDate, trip.endDate);

  return (
    <View style={styles.container}>
      <Text style={styles.destination}>{trip.destination}</Text>
      <Text style={styles.dates}>📅 {dateRange}</Text>
      <View style={[styles.badge, { backgroundColor: statusColor + '33' }]}>
        <Text style={[styles.badgeText, { color: statusColor }]}>{displayStatus}</Text>
      </View>
      <Text style={styles.budget}>
        💰 Total Budget: {trip.currency} {trip.totalBudget.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  destination: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  dates: { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  badgeText: { fontSize: 13, fontWeight: 'bold' },
  budget: { fontSize: 15, color: '#fff' },
});
