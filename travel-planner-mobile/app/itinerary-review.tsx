import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { scheduleAllTripNotifications } from '../utils/notifications';

const mockItinerary = [
  {
    day: 1,
    title: 'Arrival Day',
    flight: { info: 'TK 1234 - Istanbul to Paris', cost: '$420' },
    hotel: { name: 'Ibis Paris Centre', type: 'Budget Hotel', cost: '$85/night' },
    transport: { info: 'CDG Airport to Hotel (Taxi)', cost: '$35' },
    activities: [
      { name: 'Welcome dinner', cost: '$30' },
      { name: 'Evening walk along Seine', cost: 'Free' },
    ],
  },
  {
    day: 2,
    title: 'Explore the City',
    flight: null,
    hotel: { name: 'Ibis Paris Centre', type: 'Budget Hotel', cost: '$85/night' },
    transport: { info: 'Metro Day Pass', cost: '$15' },
    activities: [
      { name: 'Eiffel Tower visit', cost: '$28' },
      { name: 'Champs-Elysees shopping', cost: '$50' },
      { name: 'Lunch at local cafe', cost: '$20' },
    ],
  },
  {
    day: 3,
    title: 'Culture & Art',
    flight: null,
    hotel: { name: 'Ibis Paris Centre', type: 'Budget Hotel', cost: '$85/night' },
    transport: { info: 'Metro Day Pass', cost: '$15' },
    activities: [
      { name: 'Louvre Museum', cost: '$22' },
      { name: 'Evening show', cost: '$45' },
      { name: 'Breakfast at patisserie', cost: '$12' },
    ],
  },
];

const budgetBreakdown = [
  { label: 'Flights', amount: 420, color: '#38bdf8', icon: 'navigation' as const },
  { label: 'Hotels', amount: 850, color: '#22c55e', icon: 'home' as const },
  { label: 'Activities', amount: 620, color: '#f59e0b', icon: 'film' as const },
  { label: 'Transport', amount: 180, color: '#a78bfa', icon: 'truck' as const },
];

const totalBudget = budgetBreakdown.reduce((sum, item) => sum + item.amount, 0);

export default function ItineraryReviewScreen() {
  const router = useRouter();
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleConfirm = async () => {
    await scheduleAllTripNotifications('Paris, France', new Date('2025-06-10'));
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.glowOrb, styles.glowOrbTop]} pointerEvents="none" />
      <View style={[styles.glowOrb, styles.glowOrbBottom]} pointerEvents="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Feather name="chevron-left" size={22} color="#6366f1" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <Text style={styles.headerKicker}>ITINERARY REVIEW</Text>
            <Text style={styles.headerTitle}>Your Trip Plan</Text>
            <Text style={styles.headerSubtitle}>Review and confirm your AI-generated itinerary</Text>
            <View style={styles.headerDivider} />
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.cardKicker}>TRIP SUMMARY</Text>
            <Text style={styles.destinationText}>Paris, France</Text>
            <View style={styles.pillRow}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Jun 10-20, 2025</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>10 nights</Text>
              </View>
              <View style={[styles.pill, styles.pillAccent]}>
                <Text style={styles.pillAccentText}>Total: ${totalBudget}</Text>
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
                    <Feather name={item.icon} size={14} color="#9ca3af" style={styles.legendIcon} />
                    <Text style={styles.legendLabel}>{item.label}</Text>
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
                  <Feather
                    name={expandedDay === day.day ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color="#6366f1"
                  />
                </TouchableOpacity>

                {expandedDay === day.day && (
                  <View style={styles.dayExpanded}>
                    <View style={styles.expandedDivider} />
                    {day.flight && (
                      <View style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemTypeLabel}>FLIGHT</Text>
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
                        <Text style={styles.itemTypeLabel}>HOTEL</Text>
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
                        <Text style={styles.itemTypeLabel}>TRANSPORT</Text>
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
                      <View
                        key={index}
                        style={[
                          styles.activityRow,
                          index < day.activities.length - 1 && styles.activityRowSep,
                        ]}
                      >
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
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  glowOrb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  glowOrbTop: {
    top: -80,
    right: -100,
  },
  glowOrbBottom: {
    bottom: -120,
    left: -80,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 48,
    paddingVertical: 4,
  },
  backText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '500',
  },
  headerSection: {
    gap: 6,
  },
  headerKicker: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 20,
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
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
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  destinationText: {
    fontSize: 18,
    fontWeight: '700',
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
    gap: 8,
    flex: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendIcon: {
    marginRight: 2,
  },
  legendLabel: {
    fontSize: 13,
    color: '#9ca3af',
    flex: 1,
  },
  legendAmount: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  budgetTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  budgetTotalLabel: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  budgetTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  dayByDaySection: {
    gap: 12,
  },
  sectionKicker: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
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
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  dayExpanded: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  expandedDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  itemTypeLabel: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
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
    fontWeight: '700',
  },
  swapBtn: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  swapText: {
    color: '#6366f1',
    fontSize: 11,
    fontWeight: '600',
  },
  activitiesLabel: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  activityRowSep: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
    fontWeight: '700',
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
    fontWeight: '500',
  },
});
