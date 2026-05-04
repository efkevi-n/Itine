import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { tripsApi } from '@/api/trips';
import { theme } from '@/constants/theme';
import {
  computeTripStatistics,
  parseTripsResponse,
  type TripStatistics,
} from '@/utils/profileStats';

type StatDef = {
  label: string;
  key: keyof TripStatistics;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
};

const STAT_DEFS: StatDef[] = [
  { label: 'Total Trips', key: 'totalTrips', icon: 'map', accent: theme.colors.primary },
  { label: 'Active Trips', key: 'activeTrips', icon: 'activity', accent: theme.colors.success },
  {
    label: 'Completed Trips',
    key: 'completedTrips',
    icon: 'check-circle',
    accent: theme.colors.subtext,
  },
  {
    label: 'Countries Visited',
    key: 'countriesVisited',
    icon: 'globe',
    accent: theme.colors.warning,
  },
];

function StatsSkeleton() {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.65,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.statsRow}
    >
      {[0, 1, 2, 3].map((i) => (
        <Animated.View key={i} style={[styles.statCard, { opacity: pulseAnim }]}>
          <View style={[styles.statIconWrap, { borderColor: theme.colors.border }]} />
          <View style={styles.skeletonLineValue} />
          <View style={styles.skeletonLineLabel} />
        </Animated.View>
      ))}
    </ScrollView>
  );
}

export function ProfileStats() {
  const [stats, setStats] = useState<TripStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tripsApi.getAll({ page: 1, limit: 100 });
      const list = parseTripsResponse(res.data);
      setStats(computeTripStatistics(list));
    } catch {
      setStats({
        totalTrips: 0,
        activeTrips: 0,
        completedTrips: 0,
        countriesVisited: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionEyebrow}>Overview</Text>
      <Text style={styles.sectionTitle}>Trip statistics</Text>
      <View style={styles.sectionDivider} />

      {loading || !stats ? (
        <StatsSkeleton />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          {STAT_DEFS.map((def) => (
            <View key={def.key} style={styles.statCard}>
              <View style={[styles.statIconWrap, { borderColor: def.accent }]}>
                <Feather name={def.icon} size={18} color={def.accent} />
              </View>
              <Text style={styles.statValue}>{stats[def.key]}</Text>
              <Text style={styles.statLabel}>{def.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionEyebrow: {
    fontSize: 10,
    color: theme.colors.subtext,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginTop: 12,
    marginBottom: 16,
  },
  statsRow: { paddingBottom: 4, gap: 12 },
  statCard: {
    minWidth: 108,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 16,
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
    backgroundColor: theme.colors.background,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  statLabel: {
    color: theme.colors.subtext,
    marginTop: 4,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  skeletonLineValue: {
    height: 28,
    width: '55%',
    backgroundColor: theme.colors.divider,
    borderRadius: theme.radius.sm,
    marginBottom: 8,
  },
  skeletonLineLabel: {
    height: 10,
    width: '80%',
    backgroundColor: theme.colors.divider,
    borderRadius: 6,
  },
});
