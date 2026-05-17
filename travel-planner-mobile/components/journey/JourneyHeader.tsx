import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Mode = 'light' | 'dark';

interface JourneyHeaderProps {
  destination: string;
  dateRange: string;
  status: string;
  mode: Mode;
}

const palette = {
  light: {
    text: '#111827',
    muted: '#6b7280',
    panel: '#ffffff',
    border: 'rgba(15,23,42,0.08)',
    accent: '#2563eb',
    statusBg: 'rgba(34,197,94,0.12)',
    statusText: '#15803d',
  },
  dark: {
    text: '#f8fafc',
    muted: '#94a3b8',
    panel: '#141824',
    border: 'rgba(255,255,255,0.08)',
    accent: '#8b9cff',
    statusBg: 'rgba(34,197,94,0.16)',
    statusText: '#86efac',
  },
};

export function JourneyHeader({ destination, dateRange, status, mode }: JourneyHeaderProps) {
  const colors = palette[mode];

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.kicker, { color: colors.muted }]}>TRAVEL WALLET</Text>
          <Text style={[styles.title, { color: colors.text }]}>Your Journey</Text>
        </View>
        <View style={[styles.compass, { backgroundColor: colors.panel, borderColor: colors.border }]}>
          <Feather name="navigation" size={18} color={colors.accent} />
        </View>
      </View>

      <View style={[styles.tripPill, { backgroundColor: colors.panel, borderColor: colors.border }]}>
        <View style={styles.tripCopy}>
          <Text style={[styles.destination, { color: colors.text }]} numberOfLines={1}>
            {destination}
          </Text>
          <Text style={[styles.dateRange, { color: colors.muted }]} numberOfLines={1}>
            {dateRange}
          </Text>
        </View>
        <View style={[styles.status, { backgroundColor: colors.statusBg }]}>
          <Text style={[styles.statusText, { color: colors.statusText }]}>{status}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
  },
  compass: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  tripPill: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  tripCopy: { flex: 1 },
  destination: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 13,
    fontWeight: '600',
  },
  status: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
