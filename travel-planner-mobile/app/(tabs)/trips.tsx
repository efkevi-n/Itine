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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      <Text style={styles.title}>My Trips</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  title: {
    fontSize: theme.fonts.title,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 60,
    marginBottom: 24,
  },
  emptyBox: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fonts.medium,
    color: theme.colors.subtext,
    textAlign: 'center',
  },
  spacer: { height: 40 },
});
