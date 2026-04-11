import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
  const userInitials = userName.slice(0, 2).toUpperCase();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const quickStats = [
    { label: 'Total Trips', value: mockTrips.length, icon: '✈️', accent: '#3b82f6' },
    { label: 'Active', value: mockTrips.filter((trip) => trip.status === 'Active').length, icon: '🟢', accent: '#22c55e' },
    { label: 'Completed', value: mockTrips.filter((trip) => trip.status === 'Completed').length, icon: '✅', accent: '#94a3b8' },
  ];

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const getRelativeTripTime = (dates: string) => {
    const [startPart] = dates.split('–');
    const startText = `${startPart.trim()}, 2025`;
    const startDate = new Date(startText);
    if (Number.isNaN(startDate.getTime())) return 'Schedule unavailable';
    const now = new Date();
    const diffMs = startDate.getTime() - now.getTime();
    const dayDiff = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    return diffMs >= 0 ? `${dayDiff} days left` : `${dayDiff} days ago`;
  };

  const statFeatherName = (label: string): keyof typeof Feather.glyphMap => {
    if (label === 'Total Trips') return 'map';
    if (label === 'Active') return 'activity';
    return 'check-circle';
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.glowOrb, styles.glowOrbTop]} pointerEvents="none" />
      <View style={[styles.glowOrb, styles.glowOrbBottom]} pointerEvents="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.greeting}>GOOD EVENING</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#4b5563" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Search destinations...</Text>
          <TouchableOpacity style={styles.filterBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="sliders" size={18} color="#6366f1" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/new-trip')}
          activeOpacity={0.9}
        >
          <Animated.View
            style={[
              styles.ctaPulseRing,
              {
                opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.08] }),
                transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
              },
            ]}
          />
          <Text style={styles.ctaText}>Plan a New Trip</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          {quickStats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View style={[styles.statIconWrap, { borderColor: `${stat.accent}40` }]}>
                <Feather name={statFeatherName(stat.label)} size={18} color={stat.accent} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionEyebrow}>Your itinerary</Text>
          <Text style={styles.sectionTitle}>Your Trips</Text>
        </View>

        {mockTrips.map((trip) => (
          <TouchableOpacity
            key={trip.id}
            style={[
              styles.card,
              {
                borderLeftWidth: 3,
                borderLeftColor: statusColors[trip.status] ?? '#6366f1',
              },
            ]}
            onPress={() => router.push({ pathname: '/trip-detail', params: { id: trip.id } })}
            activeOpacity={0.88}
          >
            <View style={styles.cardHeader}>
              <View style={styles.destinationRow}>
                <Feather name="map-pin" size={16} color="#6366f1" style={styles.cardPinIcon} />
                <Text style={styles.destination}>{trip.destination.replace(/^[^\s]+\s/, '')}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: `${statusColors[trip.status]}22` }]}>
                <Text style={[styles.badgeText, { color: statusColors[trip.status] }]}>{trip.status}</Text>
              </View>
            </View>

            <View style={styles.cardDetailsRow}>
              <View style={styles.detailColumn}>
                <View style={styles.detailLabelRow}>
                  <Feather name="calendar" size={12} color="#4b5563" />
                  <Text style={styles.detailLabel}>Dates</Text>
                </View>
                <View style={styles.detailPill}>
                  <Text style={styles.detailValue}>{trip.dates}</Text>
                </View>
                <Text style={styles.daysMeta}>{getRelativeTripTime(trip.dates)}</Text>
              </View>
              <View style={styles.detailColumn}>
                <View style={styles.detailLabelRow}>
                  <Feather name="dollar-sign" size={12} color="#4b5563" />
                  <Text style={styles.detailLabel}>Budget</Text>
                </View>
                <View style={styles.detailPill}>
                  <Text style={styles.detailValue}>{trip.budget}</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.arrowButton}>
                <Feather name="chevron-right" size={18} color="#ffffff" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
    borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  glowOrbTop: {
    width: 400,
    height: 400,
    top: -120,
    right: -100,
  },
  glowOrbBottom: {
    width: 300,
    height: 300,
    bottom: -100,
    left: -80,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 58,
    paddingBottom: 56,
  },
  header: {
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#13131f',
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#6366f1',
    fontWeight: '700',
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 20,
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#4b5563',
    fontSize: 15,
  },
  filterBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    overflow: 'visible',
    position: 'relative',
  },
  ctaPulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.45)',
  },
  ctaText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  statsRow: {
    paddingBottom: 28,
    gap: 12,
  },
  statCard: {
    minWidth: 108,
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 30,
  },
  statLabel: {
    color: '#9ca3af',
    marginTop: 4,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  sectionTitleWrap: {
    marginBottom: 18,
  },
  sectionEyebrow: {
    fontSize: 10,
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: '#13131f',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  cardPinIcon: {
    marginRight: 8,
  },
  destination: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  detailColumn: {
    flex: 1,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  detailPill: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  detailValue: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  daysMeta: {
    marginTop: 8,
    fontSize: 11,
    color: '#6b7280',
  },
  cardFooter: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
  },
});
