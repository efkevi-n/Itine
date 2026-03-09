import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated
} from 'react-native';
import { useRouter } from 'expo-router';

const mockItinerary = [
  {
    day: 1,
    title: 'Arrival Day',
    flight: { info: 'TK 1234 — Istanbul → Paris', cost: '$420' },
    hotel: { name: 'Ibis Paris Centre', type: 'Budget Hotel', cost: '$85/night' },
    transport: { info: 'CDG Airport → Hotel (Taxi)', cost: '$35' },
    activities: [
      { name: '🍽️ Welcome dinner', cost: '$30' },
      { name: '🚶 Evening walk along Seine', cost: 'Free' },
    ],
  },
  {
    day: 2,
    title: 'Explore the City',
    flight: null,
    hotel: { name: 'Ibis Paris Centre', type: 'Budget Hotel', cost: '$85/night' },
    transport: { info: 'Metro Day Pass', cost: '$15' },
    activities: [
      { name: '🗼 Eiffel Tower visit', cost: '$28' },
      { name: '🛍️ Champs-Élysées shopping', cost: '$50' },
      { name: '🍜 Lunch at local café', cost: '$20' },
    ],
  },
  {
    day: 3,
    title: 'Culture & Art',
    flight: null,
    hotel: { name: 'Ibis Paris Centre', type: 'Budget Hotel', cost: '$85/night' },
    transport: { info: 'Metro Day Pass', cost: '$15' },
    activities: [
      { name: '🏛️ Louvre Museum', cost: '$22' },
      { name: '🎭 Evening show', cost: '$45' },
      { name: '🥐 Breakfast at patisserie', cost: '$12' },
    ],
  },
];

const budgetBreakdown = [
  { label: 'Flights', amount: 420, color: '#38bdf8', emoji: '✈️' },
  { label: 'Hotels', amount: 850, color: '#22c55e', emoji: '🏨' },
  { label: 'Activities', amount: 620, color: '#f59e0b', emoji: '🎭' },
  { label: 'Transport', amount: 180, color: '#a78bfa', emoji: '🚗' },
];

const totalBudget = budgetBreakdown.reduce((sum, item) => sum + item.amount, 0);

export default function ItineraryReviewScreen() {
  const router = useRouter();
  const [expandedDay, setExpandedDay] = useState<number | null>(1);

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🗺️ Your Itinerary</Text>
      <Text style={styles.subtitle}>Review your AI-generated trip plan</Text>

      {/* Trip Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Trip Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>✈️ Paris, France</Text>
          <Text style={styles.summaryItem}>📅 Jun 10–20, 2025</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>💰 Total: ${totalBudget}</Text>
          <Text style={styles.summaryItem}>🌙 10 nights</Text>
        </View>
      </View>

      {/* Budget Breakdown */}
      <View style={styles.budgetCard}>
        <Text style={styles.sectionTitle}>💰 Budget Breakdown</Text>
        <View style={styles.budgetBar}>
          {budgetBreakdown.map((item) => (
            <View
              key={item.label}
              style={[
                styles.budgetSegment,
                {
                  flex: item.amount / totalBudget,
                  backgroundColor: item.color,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.budgetLegend}>
          {budgetBreakdown.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.emoji} {item.label}</Text>
              <Text style={styles.legendAmount}>${item.amount}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Day by Day */}
      <Text style={styles.sectionTitle}>📅 Day-by-Day Plan</Text>
      {mockItinerary.map((day) => (
        <View key={day.day} style={styles.dayCard}>
          <TouchableOpacity
            style={styles.dayHeader}
            onPress={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
          >
            <Text style={styles.dayTitle}>Day {day.day} — {day.title}</Text>
            <Text style={styles.expandIcon}>{expandedDay === day.day ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {expandedDay === day.day && (
            <View style={styles.dayContent}>
              {day.flight && (
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel}>✈️ Flight</Text>
                    <Text style={styles.itemValue}>{day.flight.info}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemCost}>{day.flight.cost}</Text>
                    <TouchableOpacity style={styles.swapBtn}>
                      <Text style={styles.swapText}>Swap</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemLabel}>🏨 Hotel</Text>
                  <Text style={styles.itemValue}>{day.hotel.name}</Text>
                  <Text style={styles.itemSubValue}>{day.hotel.type}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemCost}>{day.hotel.cost}</Text>
                  <TouchableOpacity style={styles.swapBtn}>
                    <Text style={styles.swapText}>Swap</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemLabel}>🚗 Transport</Text>
                  <Text style={styles.itemValue}>{day.transport.info}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemCost}>{day.transport.cost}</Text>
                  <TouchableOpacity style={styles.swapBtn}>
                    <Text style={styles.swapText}>Swap</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.activitiesLabel}>🎭 Activities</Text>
              {day.activities.map((activity, index) => (
                <View key={index} style={styles.activityRow}>
                  <Text style={styles.activityName}>{activity.name}</Text>
                  <Text style={styles.activityCost}>{activity.cost}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.confirmBtn} onPress={() => router.push('/qr-pass')}>
        <Text style={styles.confirmText}>✅ Confirm & Generate QR Pass</Text>
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
  summaryCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#38bdf8', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryItem: { fontSize: 14, color: '#fff' },
  budgetCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  budgetBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
  budgetSegment: { height: '100%' },
  budgetLegend: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#fff', fontSize: 13, flex: 1 },
  legendAmount: { color: '#94a3b8', fontSize: 13 },
  dayCard: { backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  dayTitle: { fontSize: 15, fontWeight: 'bold', color: '#38bdf8' },
  expandIcon: { color: '#94a3b8', fontSize: 12 },
  dayContent: { paddingHorizontal: 16, paddingBottom: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  itemValue: { fontSize: 14, color: '#fff' },
  itemSubValue: { fontSize: 12, color: '#94a3b8' },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  itemCost: { fontSize: 14, color: '#22c55e', fontWeight: 'bold' },
  swapBtn: { backgroundColor: '#0f172a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  swapText: { color: '#38bdf8', fontSize: 11 },
  activitiesLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  activityName: { fontSize: 13, color: '#fff', flex: 1 },
  activityCost: { fontSize: 13, color: '#f59e0b' },
  confirmBtn: { backgroundColor: '#22c55e', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});