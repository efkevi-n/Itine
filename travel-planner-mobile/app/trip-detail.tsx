import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Share, Animated
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const mockTrips: Record<string, any> = {
  '1': {
    destination: 'Paris, France',
    dates: 'Jun 10 - Jun 20, 2025',
    budget: '$2,400',
    status: 'Confirmed',
    bookings: [
      {
        type: 'Flight',
        provider: 'Turkish Airlines',
        reference: 'TK1234',
        datetime: 'Jun 10, 2025 - 10:00 AM',
        detail: 'Istanbul (IST) to Paris (CDG)',
      },
      {
        type: 'Hotel',
        provider: 'Ibis Paris Centre',
        reference: 'HTL-98123',
        datetime: 'Jun 10 - Jun 20, 2025',
        detail: 'Budget Room - 10 nights',
      },
      {
        type: 'Transport',
        provider: 'Paris Taxi Service',
        reference: 'TRN-45678',
        datetime: 'Jun 10, 2025 - 02:00 PM',
        detail: 'CDG Airport to Hotel',
      },
      {
        type: 'Activity',
        provider: 'Paris Tours',
        reference: 'ACT-11234',
        datetime: 'Jun 12, 2025 - 09:00 AM',
        detail: 'Eiffel Tower + Louvre Tour',
      },
    ],
  },
  '2': {
    destination: 'Bali, Indonesia',
    dates: 'Aug 1 - Aug 14, 2025',
    budget: '$1,800',
    status: 'Pending',
    bookings: [],
  },
  '3': {
    destination: 'New York, USA',
    dates: 'Mar 5 - Mar 10, 2025',
    budget: '$3,200',
    status: 'Completed',
    bookings: [],
  },
  '4': {
    destination: 'Safari, Kenya',
    dates: 'Sep 15 - Sep 25, 2025',
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

const bookingIcons: Record<string, string> = {
  Flight: 'navigation',
  Hotel: 'home',
  Transport: 'truck',
  Activity: 'star',
};

export default function TripDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const trip = mockTrips[id as string];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!trip) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Trip not found.</Text>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My Trip to ${trip.destination}\nDates: ${trip.dates}\nBudget: ${trip.budget}\nStatus: ${trip.status}\n\nBooked via TravelAI`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const statusColor = statusColors[trip.status];

  return (
    <View style={styles.screen}>
      <View style={styles.glowOrbTop} />
      <View style={styles.glowOrbBottom} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={18} color="#6366f1" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.eyebrow}>TRIP DETAILS</Text>
          <Text style={styles.destination}>{trip.destination}</Text>

          <View style={styles.headerMeta}>
            <View style={styles.datePill}>
              <Feather name="calendar" size={12} color="#9ca3af" />
              <Text style={styles.datePillText}>{trip.dates}</Text>
            </View>
            <View style={[styles.statusBadge, {
              backgroundColor: statusColor + '1a',
              borderColor: statusColor + '66',
            }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {trip.status}
              </Text>
            </View>
          </View>

          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>TOTAL BUDGET</Text>
            <Text style={styles.budgetValue}>{trip.budget}</Text>
          </View>

          <View style={styles.divider} />

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.qrBtn}
              onPress={() => router.push('/qr-pass')}
            >
              <Feather name="maximize" size={16} color="#ffffff" />
              <Text style={styles.qrBtnText}>Show QR Pass</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Feather name="share-2" size={16} color="#9ca3af" />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Bookings Section */}
          <Text style={styles.sectionLabel}>YOUR BOOKINGS</Text>

          {trip.bookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="inbox" size={32} color="#4b5563" />
              <Text style={styles.emptyText}>
                No bookings yet. Bookings will appear here once confirmed.
              </Text>
            </View>
          ) : (
            trip.bookings.map((booking: any, index: number) => (
              <View key={index} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingIconWrap}>
                    <Feather
                      name={bookingIcons[booking.type] as any}
                      size={18}
                      color="#6366f1"
                    />
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingType}>{booking.type.toUpperCase()}</Text>
                    <Text style={styles.bookingProvider}>{booking.provider}</Text>
                  </View>
                  <View style={styles.refWrap}>
                    <Text style={styles.refLabel}>REF</Text>
                    <Text style={styles.refCode}>{booking.reference}</Text>
                  </View>
                </View>

                <View style={styles.bookingDivider} />

                <View style={styles.datetimePill}>
                  <Feather name="clock" size={11} color="#9ca3af" />
                  <Text style={styles.datetimeText}>{booking.datetime}</Text>
                </View>
                <Text style={styles.bookingDetail}>{booking.detail}</Text>
              </View>
            ))
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0d14' },
  glowOrbTop: {
    position: 'absolute', top: -100, right: -80,
    width: 320, height: 320, borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  glowOrbBottom: {
    position: 'absolute', bottom: -120, left: -80,
    width: 280, height: 280, borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 60 },
  notFound: {
    flex: 1, backgroundColor: '#0d0d14',
    justifyContent: 'center', alignItems: 'center',
  },
  notFoundText: { color: '#ffffff', fontSize: 18 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 48, marginBottom: 24, alignSelf: 'flex-start',
  },
  backText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  eyebrow: {
    fontSize: 10, color: '#4b5563', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 8,
  },
  destination: {
    fontSize: 26, fontWeight: '700', color: '#ffffff', marginBottom: 16,
  },
  headerMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  datePillText: { color: '#9ca3af', fontSize: 13 },
  statusBadge: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  budgetRow: { marginBottom: 20 },
  budgetLabel: {
    fontSize: 10, color: '#4b5563', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 4,
  },
  budgetValue: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 20,
  },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  qrBtn: {
    flex: 1, height: 50, backgroundColor: '#6366f1',
    borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  qrBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  shareBtn: {
    flex: 1, height: 50, backgroundColor: '#13131f',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  shareBtnText: { color: '#9ca3af', fontWeight: '600', fontSize: 15 },
  sectionLabel: {
    fontSize: 10, color: '#4b5563', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#13131f', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 32, alignItems: 'center', gap: 12,
  },
  emptyText: {
    color: '#4b5563', fontSize: 14, textAlign: 'center', lineHeight: 22,
  },
  bookingCard: {
    backgroundColor: '#13131f', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 16, marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  bookingIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  bookingInfo: { flex: 1 },
  bookingType: {
    fontSize: 10, color: '#4b5563',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2,
  },
  bookingProvider: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  refWrap: { alignItems: 'flex-end' },
  refLabel: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5 },
  refCode: { fontSize: 13, fontWeight: '700', color: '#6366f1' },
  bookingDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 12,
  },
  datetimePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    marginBottom: 8,
  },
  datetimeText: { color: '#9ca3af', fontSize: 12 },
  bookingDetail: { fontSize: 13, color: '#9ca3af' },
});