import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function HomeScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>✈️ Travel Planner</Text>
      <Text style={styles.welcome}>Where do you want to go?</Text>

      <View style={styles.card}>
        <Text style={styles.cardEmoji}>🗺️</Text>
        <Text style={styles.cardTitle}>Explore Destinations</Text>
        <Text style={styles.cardText}>Discover amazing places around the world.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardEmoji}>📅</Text>
        <Text style={styles.cardTitle}>Plan Your Trip</Text>
        <Text style={styles.cardText}>Organize your itinerary day by day.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardEmoji}>🏨</Text>
        <Text style={styles.cardTitle}>Find Hotels</Text>
        <Text style={styles.cardText}>Browse and book the best accommodations.</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#38bdf8', textAlign: 'center', marginTop: 60, marginBottom: 8 },
  welcome: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 },
  cardEmoji: { fontSize: 32, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  cardText: { fontSize: 14, color: '#94a3b8' },
  button: { backgroundColor: '#38bdf8', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  buttonText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
});