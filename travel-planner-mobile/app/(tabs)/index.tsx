import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList } from 'react-native';
import { useRouter } from 'expo-router';

const mockTrips = [
  {
    id: '1',
    destination: '🗼 Paris, France',
    dates: 'Jun 10 – Jun 20, 2025',
    budget: '$2,400',
    status: 'Confirmed',
  },
  {
    id: '2',
    destination: '🏝️ Bali, Indonesia',
    dates: 'Aug 1 – Aug 14, 2025',
    budget: '$1,800',
    status: 'Pending',
  },
  {
    id: '3',
    destination: '🗽 New York, USA',
    dates: 'Mar 5 – Mar 10, 2025',
    budget: '$3,200',
    status: 'Completed',
  },
  {
    id: '4',
    destination: '🌍 Safari, Kenya',
    dates: 'Sep 15 – Sep 25, 2025',
    budget: '$5,000',
    status: 'Active',
  },
];

const statusColors: Record<string, string> = {
  Pending: '#f59e0b',
  Confirmed: '#38bdf8',
  Active: '#22c55e',
  Completed: '#94a3b8',
};

export default function HomeScreen() {
  const router = useRouter();
  const userName = 'Traveler';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>👋 Welcome back,</Text>
        <Text style={styles.userName}>{userName}</Text>
      </View>

      <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/new-trip')}>
        <Text style={styles.ctaText}>✈️ Plan a New Trip</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Your Trips</Text>

      {mockTrips.map((trip) => (
        <TouchableOpacity
          key={trip.id}
          style={styles.card}
          onPress={() => router.push({ pathname: '/trip-detail', params: { id: trip.id } })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.destination}>{trip.destination}</Text>
            <View style={[styles.badge, { backgroundColor: statusColors[trip.status] + '33' }]}>
              <Text style={[styles.badgeText, { color: statusColors[trip.status] }]}>{trip.status}</Text>
            </View>
          </View>
          <Text style={styles.dates}>📅 {trip.dates}</Text>
          <Text style={styles.budget}>💰 Budget: {trip.budget}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  header: { marginTop: 60, marginBottom: 24 },
  welcome: { fontSize: 16, color: '#94a3b8' },
  userName: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  ctaButton: { backgroundColor: '#38bdf8', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 32 },
  ctaText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  destination: { fontSize: 16, fontWeight: 'bold', color: '#fff', flex: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  dates: { fontSize: 13, color: '#94a3b8', marginBottom: 4 },
  budget: { fontSize: 13, color: '#94a3b8' },
});