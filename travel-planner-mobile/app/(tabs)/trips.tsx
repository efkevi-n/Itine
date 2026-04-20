import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { tripsApi } from '@/api/trips';
import { TripCard, type TripCardData } from '@/components/TripCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorToast } from '@/components/ErrorToast';
import { theme } from '@/constants/theme';
import { mapTripToDetailView } from '@/utils/tripDetailMappers';

function normalizeTrip(raw: Record<string, unknown>): TripCardData {
  const view = mapTripToDetailView(raw);
  const id = String((raw.id ?? raw.tripId ?? ''));
  const status = (view.status || 'PENDING') as TripCardData['status'];
  const validStatus: TripCardData['status'][] = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
  return {
    id,
    destination: view.destination,
    startDate: view.startDate,
    endDate: view.endDate,
    totalBudget: view.totalBudget,
    currency: view.currency,
    status: validStatus.includes(status) ? status : 'PENDING',
  };
}

export default function MyTripsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrips = useCallback(async () => {
    setError(null);
    try {
      const res = await tripsApi.getAll({ page: 1, limit: 50 });
      const payload = res.data as unknown;
      const rawList: unknown[] = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as Record<string, unknown>)?.data)
          ? (payload as Record<string, unknown>).data as unknown[]
          : [];
      setTrips(
        rawList
          .map((t) => normalizeTrip(t as Record<string, unknown>))
          .filter((t) => t.status !== 'CANCELLED')
      );
    } catch {
      setError('Failed to load trips. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTrips();
    }, [loadTrips])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTrips();
  }, [loadTrips]);

  if (loading && trips.length === 0) {
    return <LoadingSpinner message="Loading trips..." />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.glowOrbTop} />
      <View style={styles.glowOrbBottom} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>MY TRIPS</Text>
        <Text style={styles.title}>Your Journeys</Text>
        <View style={styles.divider} />

        {error ? <ErrorToast message={error} onDismiss={() => setError(null)} /> : null}

        {trips.length === 0 && !error ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No trips yet. Plan one from Home!</Text>
          </View>
        ) : (
          trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onPress={() => router.push({ pathname: '/trip-detail', params: { tripId: trip.id } })}
            />
          ))
        )}
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  glowOrbTop: {
    position: 'absolute', top: -100, right: -80,
    width: 320, height: 320, borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  glowOrbBottom: {
    position: 'absolute', bottom: -120, left: -80,
    width: 280, height: 280, borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 60 },
  eyebrow: {
    fontSize: 10, color: '#4b5563', letterSpacing: 1.5,
    textTransform: 'uppercase', fontWeight: '600',
    marginTop: 60, marginBottom: 8,
  },
  title: {
    fontSize: 26, fontWeight: '700',
    color: theme.colors.text, marginBottom: 16, letterSpacing: -0.3,
  },
  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 24,
  },
  emptyBox: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: theme.radius.md, padding: 24, alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fonts.medium,
    color: theme.colors.subtext, textAlign: 'center',
  },
  spacer: { height: 40 },
});