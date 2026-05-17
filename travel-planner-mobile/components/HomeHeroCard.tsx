import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { TripCardData } from '@/components/TripCard';
import { theme } from '@/constants/theme';
import { formatDateRange, getRelativeTripTime } from '@/utils/homeHelpers';

interface Props {
  nextTrip: TripCardData | undefined;
  pulseAnim: Animated.Value;
  onOpenTrip: (tripId: string) => void;
  onPlanTrip: () => void;
}

export function HomeHeroCard({ nextTrip, pulseAnim, onOpenTrip, onPlanTrip }: Props) {
  return (
    <>
      <View style={s.heroCard}>
        <View style={s.heroGlow} />
        <Text style={s.heroEyebrow}>NEXT JOURNEY</Text>
        <Text style={s.heroTitle} numberOfLines={1}>
          {nextTrip?.destination ?? 'Ready when you are'}
        </Text>
        <Text style={s.heroMeta}>
          {nextTrip
            ? `${formatDateRange(nextTrip.startDate, nextTrip.endDate)} · ${getRelativeTripTime(nextTrip.startDate)}`
            : 'Build a polished itinerary and travel wallet for your next destination.'}
        </Text>
        <View style={s.heroFooter}>
          <View style={s.statusPill}>
            <Feather name={nextTrip ? 'navigation' : 'plus-circle'} size={13} color={theme.colors.primary} />
            <Text style={s.statusText}>{nextTrip?.status ?? 'NEW TRIP'}</Text>
          </View>
          <TouchableOpacity
            style={[s.openBtn, !nextTrip && s.openBtnDisabled]}
            activeOpacity={0.86}
            disabled={!nextTrip}
            onPress={() => nextTrip && onOpenTrip(nextTrip.id)}
          >
            <Text style={s.openBtnText}>{nextTrip ? 'Open' : 'No trip yet'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={s.ctaBtn} onPress={onPlanTrip} activeOpacity={0.9}>
        <Animated.View
          style={[s.pulseRing, {
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.08] }),
            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
          }]}
        />
        <View style={s.ctaRow}>
          <Feather name="map" size={18} color="#fff" />
          <Text style={s.ctaText}>Plan a New Trip</Text>
        </View>
      </TouchableOpacity>
    </>
  );
}

const s = StyleSheet.create({
  heroCard: {
    backgroundColor: theme.colors.card, borderColor: theme.colors.border,
    borderRadius: 24, borderWidth: 1, marginBottom: 16,
    overflow: 'hidden', padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  heroGlow: {
    position: 'absolute', right: -60, top: -70,
    width: 180, height: 180, borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  heroEyebrow: { color: theme.colors.subtext, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  heroTitle: { color: theme.colors.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  heroMeta: { color: theme.colors.subtext, fontSize: 13, fontWeight: '500', lineHeight: 19 },
  heroFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  statusPill: {
    alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 999, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 7,
  },
  statusText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  openBtn: { backgroundColor: theme.colors.primary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  openBtnDisabled: { backgroundColor: theme.colors.border },
  openBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  ctaBtn: {
    width: '100%', height: 54, backgroundColor: theme.colors.primary,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, overflow: 'visible', position: 'relative',
  },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14, borderWidth: 2, borderColor: 'rgba(34,197,94,0.5)',
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
