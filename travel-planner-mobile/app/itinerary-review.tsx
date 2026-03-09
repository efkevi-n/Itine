import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const mockItinerary = [
  {
    day: 1,
    title: 'Arrival Day',
    activities: [
      { time: '10:00', description: '✈️ Flight departs from origin' },
      { time: '14:00', description: '🛬 Arrive at destination' },
      { time: '15:30', description: '🏨 Check in to hotel' },
      { time: '19:00', description: '🍽️ Welcome dinner at local restaurant' },
    ],
  },
  {
    day: 2,
    title: 'Explore the City',
    activities: [
      { time: '09:00', description: '☕ Breakfast at hotel' },
      { time: '10:30', description: '🗺️ City sightseeing tour' },
      { time: '13:00', description: '🍜 Lunch at local café' },
      { time: '15:00', description: '🛍️ Shopping & exploration' },
      { time: '20:00', description: '🎭 Evening entertainment' },
    ],
  },
  {
    day: 3,
    title: 'Adventure Day',
    activities: [
      { time: '08:00', description: '🧗 Morning adventure activity' },
      { time: '12:00', description: '🥗 Lunch break' },
      { time: '14:00', description: '🏛️ Visit local attractions' },
      { time: '18:00', description: '🌅 Sunset viewing point' },
    ],
  },
];

export default function ItineraryReviewScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🗺️ Your Itinerary</Text>
      <Text style={styles.subtitle}>AI-generated trip plan — review and confirm</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Trip Summary</Text>
        <Text style={styles.summaryItem}>✈️ Paris, France</Text>
        <Text style={styles.summaryItem}>📅 Jun 10 – Jun 20, 2025</Text>
        <Text style={styles.summaryItem}>💰 Budget: $2,400 USD</Text>
        <Text style={styles.summaryItem}>🏨 Hotel: Budget Hotel</Text>
      </View>

      {mockItinerary.map((day) => (
        <View key={day.day} style={styles.dayCard}>
          <Text style={styles.dayTitle}>Day {day.day} — {day.title}</Text>
          {day.activities.map((activity, index) => (
            <View key={index} style={styles.activityRow}>
              <Text style={styles.activityTime}>{activity.time}</Text>
              <Text style={styles.activityDesc}>{activity.description}</Text>
            </View>
          ))}
        </View>
      ))}

      <TouchableOpacity style={styles.confirmBtn} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.confirmText}>✅ Confirm & Save Trip</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.rejectBtn} onPress={() => router.back()}>
        <Text style={styles.rejectText}>🔄 Regenerate</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  backButton: { marginTop: 60, marginBottom: 16 },
  backText: { color: '#38bdf8', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  summaryCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 24 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#38bdf8', marginBottom: 12 },
  summaryItem: { fontSize: 14, color: '#fff', marginBottom: 6 },
  dayCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  dayTitle: { fontSize: 16, fontWeight: 'bold', color: '#38bdf8', marginBottom: 12 },
  activityRow: { flexDirection: 'row', marginBottom: 8 },
  activityTime: { color: '#94a3b8', fontSize: 13, width: 50 },
  activityDesc: { color: '#fff', fontSize: 13, flex: 1 },
  confirmBtn: { backgroundColor: '#22c55e', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  rejectBtn: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center' },
  rejectText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 16 },
});