import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Share, Animated, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { tripsApi } from '@/api/trips';
import { bookingsApi } from '@/api/bookings';
import { BookingCard } from '@/components/BookingCard';
import { OfflineBanner } from '@/components/OfflineBanner';
import type { TripDetailView, BookingDetailView } from '@/types/trip';
import { isQrPassAvailable } from '@/utils/tripStatus';
import { mapTripToDetailView, mapBookingToDetailView } from '@/utils/tripDetailMappers';
import { formatTripDateRange } from '@/utils/dateFormat';
import { useConnectivity } from '@/hooks/useConnectivity';
import { cacheTrip, getCachedTrip } from '@/utils/offlineCache';
import { getDeepLinkForTrip } from '@/utils/deepLinkHandler';
import { SHARE_FOOTER } from '@/constants/deepLinks';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#38bdf8',
  ACTIVE: '#22c55e',
  COMPLETED: '#94a3b8',
  CANCELLED: '#ef4444',
};

export default function TripDetailScreen() {
  const router = useRouter();
  const { isOnline } = useConnectivity();
  const { id, tripId } = useLocalSearchParams<{ id?: string; tripId?: string }>();
  const resolvedId = tripId ?? id;
  const [trip, setTrip] = useState<TripDetailView | null>(null);
  const [bookings, setBookings] = useState<BookingDetailView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadData = useCallback(async () => {
    if (!resolvedId) return;
    setError(null);
    setLoading(true);
    try {
      const [tripRes, bookingsRes] = await Promise.all([
        tripsApi.getById(resolvedId),
        bookingsApi.getBookingsForTrip(resolvedId).catch(() => ({ data: [] })),
      ]);
      const tripData = tripRes.data as Record<string, unknown>;
      if (!tripData || typeof tripData !== 'object') {
        setError('Trip not found.');
        setLoading(false);
        return;
      }
      setTrip(mapTripToDetailView(tripData));
      const rawList = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      setBookings(rawList.map((b) => mapBookingToDetailView(b as Record<string, unknown>)));
      await cacheTrip(resolvedId, { trip: tripData, bookings: rawList });
    } catch {
      if (!isOnline) {
        const cached = await getCachedTrip(resolvedId);
        const data = cached?.data as { trip?: Record<string, unknown>; bookings?: unknown[] } | undefined;
        if (data?.trip) {
          setTrip(mapTripToDetailView(data.trip));
          const rawList = Array.isArray(data.bookings) ? data.bookings : [];
          setBookings(rawList.map((b) => mapBookingToDetailView(b as Record<string, unknown>)));
          setError(null);
        } else setError('Offline. No cached trip.');
      } else setError('Failed to load trip. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [resolvedId, isOnline]);

  useEffect(() => {
    if (!resolvedId) return;
    loadData();
  }, [resolvedId, loadData]);

  const handleCancel = useCallback(() => {
    if (!resolvedId) return;
    Alert.alert(
      'Cancel Trip',
      'Are you sure you want to cancel this trip? This cannot be undone.',
      [
        { text: 'Keep Trip', style: 'cancel' },
        {
          text: 'Cancel Trip',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              if (trip?.status?.toUpperCase() === 'PENDING') {
                await tripsApi.delete(resolvedId);
              } else {
                await tripsApi.update(resolvedId, { status: 'CANCELLED' });
              }
              router.replace('/(tabs)/trips');
            } catch {
              setCancelling(false);
              Alert.alert('Error', 'Failed to cancel trip. Please try again.');
            }
          },
        },
      ]
    );
  }, [resolvedId, router, trip?.status]);

  const handleShare = useCallback(async () => {
    if (!trip || !resolvedId) return;
    const deepLink = getDeepLinkForTrip(resolvedId);
    const message = [
      `🌍 My trip to ${trip.destination}`,
      `📅 ${formatTripDateRange(trip.startDate, trip.endDate)}`,
      `💰 Budget: ${trip.currency} ${trip.totalBudget.toLocaleString()}`,
      `🔗 ${deepLink}`,
      SHARE_FOOTER,
    ].join('\n');
    try {
      await Share.share({ message });
    } catch {
      // ignore
    }
  }, [trip, resolvedId]);

  if (!resolvedId) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Trip not found.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading trip...</Text>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />
        <Text style={styles.errorText}>{error ?? 'Trip not found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[trip.status?.toUpperCase()] ?? '#94a3b8';
  const showQr = isQrPassAvailable(trip.status);
  const isActive = trip.status?.toUpperCase() === 'ACTIVE';
  const isPending = trip.status?.toUpperCase() === 'PENDING';
  const isCancellable = ['PENDING', 'CONFIRMED'].includes(trip.status?.toUpperCase());
  const datesFormatted = formatTripDateRange(trip.startDate, trip.endDate);

  return (
    <View style={styles.screen}>
      <View style={styles.glowOrbTop} />
      <View style={styles.glowOrbBottom} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <OfflineBanner visible={!isOnline} />

        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={18} color="#6366f1" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.eyebrow}>TRIP DETAILS</Text>
          <Text style={styles.destination}>{trip.destination}</Text>

          <View style={styles.headerMeta}>
            <View style={styles.datePill}>
              <Feather name="calendar" size={12} color="#9ca3af" />
              <Text style={styles.datePillText}>{datesFormatted}</Text>
            </View>
            <View style={[styles.statusBadge, {
              backgroundColor: `${statusColor}1a`,
              borderColor: `${statusColor}66`,
            }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {trip.status?.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>TOTAL BUDGET</Text>
            <Text style={styles.budgetValue}>{trip.currency} {trip.totalBudget.toLocaleString()}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.actionsStack}>
            {showQr && (
              <TouchableOpacity
                style={styles.qrBtn}
                onPress={() => router.push({ pathname: '/qr-pass', params: { tripId: resolvedId } })}
                activeOpacity={0.88}
              >
                <Feather name="smartphone" size={18} color="#ffffff" />
                <Text style={styles.qrBtnText} numberOfLines={1}>
                  Show QR Pass
                </Text>
              </TouchableOpacity>
            )}
            {isActive && (
              <TouchableOpacity
                style={styles.trackBtn}
                onPress={() => router.push({ pathname: '/active-trip', params: { tripId: resolvedId } })}
                activeOpacity={0.88}
              >
                <Feather name="navigation" size={18} color="#ffffff" />
                <Text style={styles.trackBtnText} numberOfLines={1}>
                  Track Live
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.88}>
              <Feather name="share-2" size={18} color="#9ca3af" />
              <Text style={styles.shareBtnText} numberOfLines={1}>
                Share trip
              </Text>
            </TouchableOpacity>
          </View>

          {isPending && (
            <TouchableOpacity
              style={styles.confirmItineraryBtn}
              onPress={() =>
                router.push({ pathname: '/itinerary-review', params: { tripId: resolvedId } })
              }
              activeOpacity={0.88}
            >
              <Feather name="check-square" size={18} color="#ffffff" />
              <Text style={styles.confirmItineraryBtnText} numberOfLines={1}>
                View Itinerary & Confirm
              </Text>
            </TouchableOpacity>
          )}

          {isCancellable && (
            <TouchableOpacity
              style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
              onPress={handleCancel}
              disabled={cancelling}
              activeOpacity={0.8}
            >
              {cancelling
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <Feather name="x-circle" size={16} color="#ef4444" />}
              <Text style={styles.cancelBtnText}>
                {cancelling ? 'Cancelling...' : 'Cancel Trip'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.budgetNavBtn}
            onPress={() => router.push({ pathname: '/budget-breakdown', params: { tripId: resolvedId, totalBudget: trip.totalBudget, currency: trip.currency } })}
          >
            <Feather name="pie-chart" size={16} color="#6366f1" />
            <Text style={styles.budgetNavBtnText}>Budget Breakdown</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>YOUR BOOKINGS</Text>

          {bookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="inbox" size={32} color="#4b5563" />
              <Text style={styles.emptyText}>
                No bookings yet. Bookings will appear here once confirmed.
              </Text>
            </View>
          ) : (
            bookings.map((b, i) => <BookingCard key={b.id ?? i} booking={b} />)
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0d14' },
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
  centerContainer: {
    flex: 1, backgroundColor: '#0d0d14',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  notFound: { flex: 1, backgroundColor: '#0d0d14', justifyContent: 'center', alignItems: 'center' },
  notFoundText: { color: '#ffffff', fontSize: 18 },
  loadingText: { color: '#9ca3af', marginTop: 16, fontSize: 14 },
  errorText: { color: '#f87171', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#6366f1', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginBottom: 12 },
  retryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  backLink: { color: '#4b5563', fontSize: 14 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 48, marginBottom: 24, alignSelf: 'flex-start',
  },
  backText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  eyebrow: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  destination: { fontSize: 26, fontWeight: '700', color: '#ffffff', marginBottom: 16 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  datePillText: { color: '#9ca3af', fontSize: 13 },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontSize: 13, fontWeight: '600' },
  budgetRow: { marginBottom: 20 },
  budgetLabel: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  budgetValue: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 20 },
  actionsStack: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  qrBtn: {
    width: '100%',
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  qrBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
    textAlign: 'center',
  },
  trackBtn: {
    width: '100%',
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  trackBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
    textAlign: 'center',
  },
  shareBtn: {
    width: '100%',
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#13131f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  shareBtnText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 15,
    flexShrink: 1,
    textAlign: 'center',
  },
  confirmItineraryBtn: {
    width: '100%',
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  confirmItineraryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
    textAlign: 'center',
  },
  budgetNavBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, backgroundColor: '#13131f', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', marginBottom: 28,
  },
  budgetNavBtnText: { color: '#6366f1', fontWeight: '600', fontSize: 15 },
  sectionLabel: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 },
  emptyCard: {
    backgroundColor: '#13131f', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 32, alignItems: 'center', gap: 12,
  },
  emptyText: { color: '#4b5563', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginBottom: 20,
  },
  cancelBtnDisabled: { opacity: 0.5 },
  cancelBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
});
