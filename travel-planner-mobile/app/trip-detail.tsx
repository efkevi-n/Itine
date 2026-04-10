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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.headerSection}>
        <Text style={styles.headerLabel}>TRIP DETAILS</Text>
        <Text style={styles.destination}>{trip.destination}</Text>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>{trip.dates}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: `${statusColors[trip.status]}1A`,
              borderColor: `${statusColors[trip.status]}66`,
            },
          ]}
        >
          <Text style={[styles.statusText, { color: statusColors[trip.status] }]}>{trip.status}</Text>
        </View>

        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>TOTAL BUDGET</Text>
          <Text style={styles.budgetValue}>{trip.budget}</Text>
        </View>
      </View>

      <View style={styles.headerDivider} />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.qrBtn} onPress={() => router.push('/qr-pass')}>
          <Text style={styles.qrBtnText}>Show QR Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share Trip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bookingsSection}>
        <Text style={styles.sectionLabel}>YOUR BOOKINGS</Text>

        {trip.bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No bookings yet. Bookings will appear here once confirmed.</Text>
          </View>
        ) : (
          trip.bookings.map((booking: any, index: number) => (
            <View key={index} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={styles.bookingLeft}>
                  <Text style={styles.bookingEmoji}>{booking.emoji}</Text>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingType}>{booking.type}</Text>
                    <Text style={styles.bookingProvider}>{booking.provider}</Text>
                  </View>
                </View>
                <View style={styles.refContainer}>
                  <Text style={styles.refLabel}>REF</Text>
                  <Text style={styles.refCode}>{booking.reference}</Text>
                </View>
              </View>

              <View style={styles.bookingDivider} />

              <View style={styles.datetimePill}>
                <Text style={styles.datetimeText}>🕐 {booking.datetime}</Text>
              </View>
              <Text style={styles.bookingDetail}>{booking.detail}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: 48,
    marginBottom: 24,
  },
  backText: {
    color: '#6366f1',
    fontSize: 16,
  },
  headerSection: {
    gap: 12,
  },
  headerLabel: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  destination: {
    fontSize: 26,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  datePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  budgetRow: {
    marginTop: 2,
  },
  budgetLabel: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  budgetValue: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  headerDivider: {
    marginTop: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  qrBtn: {
    flex: 1,
    height: 50,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  shareBtn: {
    flex: 1,
    height: 50,
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: 'bold',
  },
  bookingsSection: {
    marginTop: 24,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bookingEmoji: {
    fontSize: 24,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingType: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.3,
    fontWeight: '600',
    marginBottom: 2,
  },
  bookingProvider: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  refContainer: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  refLabel: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  refCode: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: 'bold',
    marginTop: 2,
  },
  bookingDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 12,
  },
  datetimePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  datetimeText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  bookingDetail: {
    fontSize: 13,
    color: '#9ca3af',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});