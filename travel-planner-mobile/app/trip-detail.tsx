import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Share
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const mockTrips: Record<string, any> = {
  '1': {
    destination: '🗼 Paris, France',
    dates: 'Jun 10 – Jun 20, 2025',
    budget: '$2,400',
    status: 'Confirmed',
    bookings: [
      {
        type: 'Flight',
        emoji: '✈️',
        provider: 'Turkish Airlines',
        reference: 'TK1234',
        datetime: 'Jun 10, 2025 — 10:00 AM',
        detail: 'Istanbul (IST) → Paris (CDG)',
      },
      {
        type: 'Hotel',
        emoji: '🏨',
        provider: 'Ibis Paris Centre',
        reference: 'HTL-98123',
        datetime: 'Jun 10 – Jun 20, 2025',
        detail: 'Budget Room — 10 nights',
      },
      {
        type: 'Transport',
        emoji: '🚕',
        provider: 'Paris Taxi Service',
        reference: 'TRN-45678',
        datetime: 'Jun 10, 2025 — 02:00 PM',
        detail: 'CDG Airport → Hotel',
      },
      {
        type: 'Activity',
        emoji: '🎭',
        provider: 'Paris Tours',
        reference: 'ACT-11234',
        datetime: 'Jun 12, 2025 — 09:00 AM',
        detail: 'Eiffel Tower + Louvre Tour',
      },
    ],
  },
  '2': {
    destination: '🏝️ Bali, Indonesia',
    dates: 'Aug 1 – Aug 14, 2025',
    budget: '$1,800',
    status: 'Pending',
    bookings: [],
  },
  '3': {
    destination: '🗽 New York, USA',
    dates: 'Mar 5 – Mar 10, 2025',
    budget: '$3,200',
    status: 'Completed',
    bookings: [],
  },
  '4': {
    destination: '🌍 Safari, Kenya',
    dates: 'Sep 15 – Sep 25, 2025',
    budget: '$5,000',
    status: 'Active',
    bookings: [],
  },
};

const statusColors: Record<string, string> = {
  Pending: '#f59e0b',
  Confirmed: '#38bdf8',
  Active: '#22c55e',
  Completed: '#94a3b8',
};

export default function TripDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const trip = mockTrips[id as string];

  if (!trip) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Trip not found.</Text>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `✈️ My Trip to ${trip.destination}\n📅 ${trip.dates}\n💰 Budget: ${trip.budget}\nStatus: ${trip.status}\n\nBooked via Travel Planner App`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <Text style={styles.destination}>{trip.destination}</Text>
      <Text style={styles.dates}>📅 {trip.dates}</Text>

      <View style={[styles.badge, { backgroundColor: statusColors[trip.status] + '33' }]}>
        <Text style={[styles.badgeText, { color: statusColors[trip.status] }]}>{trip.status}</Text>
      </View>

      <Text style={styles.budget}>💰 Total Budget: {trip.budget}</Text>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.qrBtn} onPress={() => router.push('/qr-pass')}>
          <Text style={styles.qrBtnText}>🎫 Show QR Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>📤 Share Trip</Text>
        </TouchableOpacity>
      </View>

      {/* Bookings */}
      <Text style={styles.sectionTitle}>Your Bookings</Text>

      {trip.bookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No bookings yet. Bookings will appear here once confirmed.</Text>
        </View>
      ) : (
        trip.bookings.map((booking: any, index: number) => (
          <View key={index} style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingEmoji}>{booking.emoji}</Text>
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingType}>{booking.type}</Text>
                <Text style={styles.bookingProvider}>{booking.provider}</Text>
              </View>
              <View style={styles.refContainer}>
                <Text style={styles.refLabel}>REF</Text>
                <Text style={styles.refCode}>{booking.reference}</Text>
              </View>
            </View>
            <View style={styles.bookingDivider} />
            <Text style={styles.bookingDatetime}>🕐 {booking.datetime}</Text>
            <Text style={styles.bookingDetail}>{booking.detail}</Text>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  backButton: { marginTop: 60, marginBottom: 24 },
  backText: { color: '#38bdf8', fontSize: 16 },
  destination: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  dates: { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  badgeText: { fontSize: 13, fontWeight: 'bold' },
  budget: { fontSize: 15, color: '#fff', marginBottom: 24 },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  qrBtn: { flex: 1, backgroundColor: '#38bdf8', borderRadius: 12, padding: 14, alignItems: 'center' },
  qrBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },
  shareBtn: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 14, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  bookingCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookingEmoji: { fontSize: 28 },
  bookingInfo: { flex: 1 },
  bookingType: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  bookingProvider: { fontSize: 13, color: '#94a3b8' },
  refContainer: { alignItems: 'flex-end' },
  refLabel: { fontSize: 10, color: '#94a3b8' },
  refCode: { fontSize: 13, fontWeight: 'bold', color: '#38bdf8' },
  bookingDivider: { height: 1, backgroundColor: '#0f172a', marginVertical: 12 },
  bookingDatetime: { fontSize: 13, color: '#94a3b8', marginBottom: 4 },
  bookingDetail: { fontSize: 13, color: '#fff' },
  emptyCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyText: { color: '#94a3b8', textAlign: 'center', fontSize: 14 },
  errorText: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 100 },
});