import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { scheduleAllTripNotifications } from '../utils/notifications';

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

  const handleConfirm = async () => {
    await scheduleAllTripNotifications('Paris, France', new Date('2025-06-10'));
    router.replace('/(tabs)');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.headerSection}>
        <Text style={styles.headerKicker}>ITINERARY REVIEW</Text>
        <Text style={styles.headerTitle}>Your Trip Plan</Text>
        <Text style={styles.headerSubtitle}>Review and confirm your AI-generated itinerary</Text>
        <View style={styles.headerDivider} />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.cardKicker}>TRIP SUMMARY</Text>
        <Text style={styles.destinationText}>{'\u2708\uFE0F'} Paris, France</Text>
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{'\uD83D\uDCC5'} Jun 10–20, 2025</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{'\uD83C\uDF19'} 10 nights</Text>
          </View>
          <View style={[styles.pill, styles.pillAccent]}>
            <Text style={styles.pillAccentText}>{'\uD83D\uDCB0'} Total: ${totalBudget}</Text>
          </View>
        </View>
      </View>

      <View style={styles.budgetCard}>
        <Text style={styles.cardKicker}>BUDGET BREAKDOWN</Text>
        <View style={styles.budgetBar}>
          {budgetBreakdown.map((item) => (
            <View
              key={item.label}
              style={[
                styles.budgetSegment,
                { flex: item.amount / totalBudget, backgroundColor: item.color },
              ]}
            />
          ))}
        </View>
        <View style={styles.budgetLegend}>
          {budgetBreakdown.map((item) => (
            <View key={item.label} style={styles.legendRow}>
              <View style={styles.legendLeft}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>
                  {item.emoji} {item.label}
                </Text>
              </View>
              <Text style={styles.legendAmount}>${item.amount}</Text>
            </View>
          ))}
        </View>
        <View style={styles.budgetTotalRow}>
          <Text style={styles.budgetTotalLabel}>TOTAL</Text>
          <Text style={styles.budgetTotalValue}>${totalBudget}</Text>
        </View>
      </View>

      <View style={styles.dayByDaySection}>
        <Text style={styles.sectionKicker}>DAY-BY-DAY PLAN</Text>
        {mockItinerary.map((day) => (
          <View key={day.day} style={styles.dayCard}>
            <TouchableOpacity
              style={styles.dayHeader}
              onPress={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.dayKicker}>DAY {day.day}</Text>
                <Text style={styles.dayTitle}>{day.title}</Text>
              </View>
              <Text style={styles.expandIcon}>{expandedDay === day.day ? '\u25B2' : '\u25BC'}</Text>
            </TouchableOpacity>

            {expandedDay === day.day && (
              <View style={styles.dayExpanded}>
                <View style={styles.expandedDivider} />
                {day.flight && (
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTypeLabel}>{'\u2708\uFE0F'} FLIGHT</Text>
                      <Text style={styles.itemValue}>{day.flight.info}</Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.itemCost}>{day.flight.cost}</Text>
                      <TouchableOpacity style={styles.swapBtn} activeOpacity={0.7}>
                        <Text style={styles.swapText}>Swap</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTypeLabel}>{'\uD83C\uDFE8'} HOTEL</Text>
                    <Text style={styles.itemValue}>{day.hotel.name}</Text>
                    <Text style={styles.itemSubValue}>{day.hotel.type}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemCost}>{day.hotel.cost}</Text>
                    <TouchableOpacity style={styles.swapBtn} activeOpacity={0.7}>
                      <Text style={styles.swapText}>Swap</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTypeLabel}>{'\uD83D\uDE97'} TRANSPORT</Text>
                    <Text style={styles.itemValue}>{day.transport.info}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemCost}>{day.transport.cost}</Text>
                    <TouchableOpacity style={styles.swapBtn} activeOpacity={0.7}>
                      <Text style={styles.swapText}>Swap</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.activitiesLabel}>ACTIVITIES</Text>
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
      </View>

      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
        <Text style={styles.confirmText}>Confirm & Generate QR Pass</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.regenerateBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Text style={styles.regenerateText}>Regenerate</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: 48,
    paddingVertical: 4,
  },
  backText: {
    color: '#6366f1',
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  headerSection: {
    gap: 6,
  },
  headerKicker: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 10,
  },
  summaryCard: {
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cardKicker: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  destinationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  pillAccent: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: 'rgba(99,102,241,0.25)',
  },
  pillAccentText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
  },
  budgetCard: {
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  budgetBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetSegment: {
    height: '100%',
  },
  budgetLegend: {
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 13,
    color: '#9ca3af',
    flex: 1,
  },
  legendAmount: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  budgetTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  budgetTotalLabel: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  budgetTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dayByDaySection: {
    gap: 12,
  },
  sectionKicker: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  dayCard: {
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dayKicker: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  expandIcon: {
    color: '#6366f1',
    fontSize: 14,
  },
  dayExpanded: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  itemTypeLabel: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  itemSubValue: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  itemCost: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  swapBtn: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  swapText: {
    color: '#6366f1',
    fontSize: 11,
    fontWeight: '500',
  },
  activitiesLabel: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityName: {
    fontSize: 14,
    color: '#9ca3af',
    flex: 1,
    paddingRight: 12,
  },
  activityCost: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
  },
  confirmBtn: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  regenerateBtn: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  regenerateText: {
    color: '#9ca3af',
    fontSize: 16,
  },
});
