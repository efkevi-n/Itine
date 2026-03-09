import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const mockTrips: Record<string, any> = {
  '1': { destination: '🗼 Paris, France', dates: 'Jun 10 – Jun 20, 2025', budget: '$2,400', status: 'Confirmed' },
  '2': { destination: '🏝️ Bali, Indonesia', dates: 'Aug 1 – Aug 14, 2025', budget: '$1,800', status: 'Pending' },
  '3': { destination: '🗽 New York, USA', dates: 'Mar 5 – Mar 10, 2025', budget: '$3,200', status: 'Completed' },
  '4': { destination: '🌍 Safari, Kenya', dates: 'Sep 15 – Sep 25, 2025', budget: '$5,000', status: 'Active' },
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

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.destination}>{trip.destination}</Text>

      <View style={[styles.badge, { backgroundColor: statusColors[trip.status] + '33' }]}>
        <Text style={[styles.badgeText, { color: statusColors[trip.status] }]}>{trip.status}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>📅 Dates</Text>
        <Text style={styles.value}>{trip.dates}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>💰 Total Budget</Text>
        <Text style={styles.value}>{trip.budget}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>✈️ Flight</Text>
        <Text style={styles.value}>To be confirmed</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>🏨 Hotel</Text>
        <Text style={styles.value}>To be confirmed</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>🚗 Transport</Text>
        <Text style={styles.value}>To be confirmed</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  backButton: { marginTop: 60, marginBottom: 24 },
  backText: { color: '#38bdf8', fontSize: 16 },
  destination: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 24 },
  badgeText: { fontSize: 13, fontWeight: 'bold' },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { fontSize: 13, color: '#94a3b8', marginBottom: 4 },
  value: { fontSize: 16, color: '#fff', fontWeight: '500' },
  errorText: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 100 },
});