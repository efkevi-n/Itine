import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BookingDetailView } from '@/types/trip';
import { ServiceIcon } from './ServiceIcon';

interface BookingCardProps {
  booking: BookingDetailView;
}

function formatDate(d: string | undefined): string {
  if (!d) return '—';
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function BookingCard({ booking }: BookingCardProps) {
  const validFrom = formatDate(booking.validFrom);
  const validUntil = formatDate(booking.validUntil);
  const dateRange = validFrom === validUntil ? validFrom : `${validFrom} – ${validUntil}`;
  const statusLabel = (booking.status || 'active').toLowerCase() === 'used' ? 'Used' : 'Active';
  const typeLabel = booking.serviceType
    ? booking.serviceType.charAt(0).toUpperCase() + booking.serviceType.slice(1).toLowerCase()
    : 'Booking';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ServiceIcon serviceType={booking.serviceType} />
        <View style={styles.info}>
          <Text style={styles.type}>{typeLabel}</Text>
          <Text style={styles.provider}>{booking.providerName}</Text>
        </View>
        {booking.reference ? (
          <View style={styles.refContainer}>
            <Text style={styles.refLabel}>REF</Text>
            <Text style={styles.refCode}>{booking.reference}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.divider} />
      <Text style={styles.datetime}>🕐 {dateRange}</Text>
      <Text style={styles.status}>Status: {statusLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  type: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  provider: { fontSize: 13, color: '#94a3b8' },
  refContainer: { alignItems: 'flex-end' },
  refLabel: { fontSize: 10, color: '#94a3b8' },
  refCode: { fontSize: 13, fontWeight: 'bold', color: '#38bdf8' },
  divider: { height: 1, backgroundColor: '#0f172a', marginVertical: 12 },
  datetime: { fontSize: 13, color: '#94a3b8', marginBottom: 4 },
  status: { fontSize: 13, color: '#fff' },
});
