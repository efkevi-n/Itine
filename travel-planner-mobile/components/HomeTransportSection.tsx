import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { TripCardData } from '@/components/TripCard';
import { theme } from '@/constants/theme';
import { getCity, getTransportGuide } from '@/utils/homeHelpers';

interface Props {
  transportTrips: TripCardData[];
}

export function HomeTransportSection({ transportTrips }: Props) {
  if (transportTrips.length === 0) {
    return (
      <View style={s.empty}>
        <Feather name="navigation" size={17} color={theme.colors.subtext} />
        <Text style={s.emptyText}>Transport tips appear when you have an upcoming trip.</Text>
      </View>
    );
  }
  return (
    <>
      {transportTrips.map((trip) => {
        const guide = getTransportGuide(trip.destination);
        return (
          <View key={`tr-${trip.id}`} style={s.card}>
            <View style={s.header}>
              <View>
                <Text style={s.city}>{getCity(trip.destination)}</Text>
                <Text style={s.label}>Guidance only — not live availability</Text>
              </View>
              <View style={s.iconWrap}>
                <Feather name="navigation" size={16} color={theme.colors.primary} />
              </View>
            </View>
            <Text style={s.copy}>{guide.airport}</Text>
            <View style={s.pillRow}>
              {guide.systems.map((sys) => (
                <View key={sys} style={s.pill}>
                  <Text style={s.pillText}>{sys}</Text>
                </View>
              ))}
            </View>
            <Text style={s.taxi}>{guide.taxi}</Text>
          </View>
        );
      })}
    </>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card, borderColor: theme.colors.border,
    borderRadius: 18, borderWidth: 1, marginBottom: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 12 },
  city: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  label: { color: theme.colors.subtext, fontSize: 11, fontWeight: '600', marginTop: 3 },
  iconWrap: {
    alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 12, height: 36, justifyContent: 'center', width: 36,
  },
  copy: { color: theme.colors.subtext, fontSize: 13, fontWeight: '500', lineHeight: 19 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  pill: {
    backgroundColor: theme.colors.divider, borderColor: theme.colors.border,
    borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6,
  },
  pillText: { color: theme.colors.text, fontSize: 11, fontWeight: '700' },
  taxi: { color: theme.colors.subtext, fontSize: 12, fontWeight: '500', lineHeight: 18, marginTop: 10 },
  empty: {
    alignItems: 'center', backgroundColor: theme.colors.card, borderColor: theme.colors.border,
    borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 22, padding: 14,
  },
  emptyText: { color: theme.colors.subtext, flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },
});
