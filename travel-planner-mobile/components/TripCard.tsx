import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatTripDateRange } from '@/utils/dateFormat';

export type TripStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

const STATUS_COLORS: Record<TripStatus, string> = {
  PENDING: '#94a3b8',      // grey
  CONFIRMED: '#38bdf8',    // blue
  ACTIVE: '#22c55e',       // green
  COMPLETED: '#64748b',    // dark grey
  CANCELLED: '#ef4444',    // red
};

export interface TripCardData {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency: string;
  status: TripStatus;
}

interface TripCardProps {
  trip: TripCardData;
  onPress: () => void;
}

function getStatusColor(status: string): string {
  const key = status.toUpperCase() as TripStatus;
  return STATUS_COLORS[key] ?? '#94a3b8';
}

export function TripCard({ trip, onPress }: TripCardProps) {
  const statusColor = getStatusColor(trip.status);
  const displayStatus = trip.status.charAt(0) + trip.status.slice(1).toLowerCase();
  const dateRange = formatTripDateRange(trip.startDate, trip.endDate);
  const budgetStr = `${trip.currency} ${trip.totalBudget.toLocaleString()}`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <Text style={styles.destination} numberOfLines={1}>{trip.destination}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor + '33' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{displayStatus}</Text>
        </View>
      </View>
      <Text style={styles.dates}>📅 {dateRange}</Text>
      <Text style={styles.budget}>💰 {budgetStr}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  destination: { fontSize: 16, fontWeight: 'bold', color: '#fff', flex: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  dates: { fontSize: 13, color: '#94a3b8', marginBottom: 4 },
  budget: { fontSize: 13, color: '#94a3b8' },
});
