import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { userApi } from '@/api/user';
import { tripsApi } from '@/api/trips';
import { TripCard, type TripCardData } from '@/components/TripCard';
import { getAccessToken } from '@/utils/auth';
import { clearTokens } from '@/utils/auth';

function normalizeTrip(raw: Record<string, unknown>): TripCardData {
  const id = String(raw.id ?? raw.tripId ?? '');
  const destination = String(raw.destination ?? '');
  const startDate = String(raw.startDate ?? raw.start_date ?? '');
  const endDate = String(raw.endDate ?? raw.end_date ?? '');
  const totalBudget = Number(raw.totalBudget ?? raw.total_budget ?? 0);
  const currency = String(raw.currency ?? 'USD');
  const status = String(raw.status ?? 'PENDING').toUpperCase() as TripCardData['status'];
  const validStatus: TripCardData['status'][] = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
  return {
    id,
    destination,
    startDate,
    endDate,
    totalBudget,
    currency,
    status: validStatus.includes(status) ? status : 'PENDING',
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [trips, setTrips] = useState<TripCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const checkAuthAndFetch = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setError(null);
    try {
      const [profileRes, tripsRes] = await Promise.all([
        userApi.getProfile(),
        tripsApi.getAll({ page: 1, limit: 10 }),
      ]);

      const profile = (profileRes.data as { user?: { name?: string; email?: string }; name?: string; firstName?: string; email?: string })?.user
        ?? profileRes.data as { name?: string; firstName?: string; email?: string };
      const name =
        profile?.name
        ?? profile?.firstName
        ?? (profile?.email ? profile.email.split('@')[0] : '')
        || 'Traveler';
      setUserName(name);

      const rawList = tripsRes.data;
      const list = Array.isArray(rawList) ? rawList : [];
      setTrips(list.map((t: Record<string, unknown>) => normalizeTrip(t)));
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e?.response?.status === 401) {
        await clearTokens();
        router.replace('/login');
        return;
      }
      setError(e?.response?.data?.message ?? 'Failed to load. Pull to refresh.');
      setUserName((prev) => prev || 'Traveler');
    } finally {
      setLoading(false);
      setTripsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const token = await getAccessToken();
        if (!token) {
          if (!cancelled) router.replace('/login');
          return;
        }
        setLoading(true);
        setTripsLoading(true);
        await checkAuthAndFetch();
      })();
      return () => { cancelled = true; };
    }, [checkAuthAndFetch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAuthAndFetch();
  };

  if (loading && !userName) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcome}>👋 Welcome back,</Text>
        <Text style={styles.userName}>{userName || 'Traveler'}</Text>
      </View>

      <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/new-trip')}>
        <Text style={styles.ctaText}>✈️ Plan a New Trip</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Your Trips</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : tripsLoading && trips.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.loadingSubtext}>Loading trips...</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No trips yet, plan your first one!</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12 },
  header: { marginTop: 60, marginBottom: 24 },
  welcome: { fontSize: 16, color: '#94a3b8' },
  userName: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  ctaButton: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  ctaText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: { color: '#fca5a5', textAlign: 'center' },
  loadingBox: { alignItems: 'center', paddingVertical: 32 },
  loadingSubtext: { color: '#94a3b8', marginTop: 8 },
  emptyBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#94a3b8', fontSize: 16, textAlign: 'center' },
});
