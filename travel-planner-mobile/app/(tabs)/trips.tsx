import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { tripsApi } from '@/api/trips';
import { userApi } from '@/api/user';
import type { TripCardData } from '@/components/TripCard';
import { formatTripDateRange } from '@/utils/dateFormat';
import { mapTripToDetailView } from '@/utils/tripDetailMappers';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UserAvatar } from '@/components/UserAvatar';
import { TripCoverImage } from '@/components/TripCoverImage';
import { getResolvedProfilePhotoUrl } from '@/utils/profileMappers';

const BG = '#F8F8F6';
const TEXT = '#111827';
const GREEN = '#10B981';
const GREY = '#6B7280';

type FilterTab = 'upcoming' | 'past' | 'drafts' | 'archived';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'archived', label: 'Archived' },
];

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 10,
  elevation: 2,
};

const HERO_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 4,
};

function normalizeTrip(raw: Record<string, unknown>): TripCardData {
  const view = mapTripToDetailView(raw);
  const id = String(raw.id ?? raw.tripId ?? '');
  const status = (view.status || 'PENDING') as TripCardData['status'];
  const validStatus: TripCardData['status'][] = [
    'PENDING',
    'CONFIRMED',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
  ];
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

function getTripTitle(destination: string): string {
  const city = destination.split(',')[0]?.trim();
  return city ? `${city} Explorer` : destination;
}

function countTripDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
}

function getRelativeLabel(startDate: string): string {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return 'Upcoming';
  const diffDays = Math.ceil((start.getTime() - Date.now()) / 86400000);
  if (diffDays <= 0) return 'Starting soon';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 14) return `In ${diffDays} Days`;
  const weeks = Math.round(diffDays / 7);
  if (diffDays < 60) return `In ${weeks} Weeks`;
  const months = Math.round(diffDays / 30);
  return `In ${months} Month${months === 1 ? '' : 's'}`;
}

function filterTrips(trips: TripCardData[], tab: FilterTab, search: string): TripCardData[] {
  const q = search.trim().toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let filtered = trips;
  if (tab === 'upcoming') {
    filtered = trips.filter((t) => {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
      if (t.status === 'ACTIVE') return true;
      const end = new Date(t.endDate);
      return Number.isNaN(end.getTime()) || end >= today;
    });
  } else if (tab === 'past') {
    filtered = trips.filter((t) => {
      if (t.status === 'COMPLETED') return true;
      const end = new Date(t.endDate);
      return !Number.isNaN(end.getTime()) && end < today;
    });
  } else if (tab === 'drafts') {
    filtered = trips.filter((t) => t.status === 'PENDING');
  } else {
    filtered = trips.filter((t) => t.status === 'COMPLETED');
  }

  if (q) {
    filtered = filtered.filter((t) => t.destination.toLowerCase().includes(q));
  }
  return filtered;
}

export default function MyTripsScreen() {
  const router = useRouter();
  const { top, tabScrollBottom, tabBarHeight } = useScreenInsets();
  useRequireAuth();
  const [trips, setTrips] = useState<TripCardData[]>([]);
  const [userPhotoUrl, setUserPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('upcoming');

  const loadTrips = useCallback(async () => {
    setError(null);
    try {
      const [tripsRes, profileRes] = await Promise.all([
        tripsApi.getAll({ page: 1, limit: 50 }),
        userApi.getProfile().catch(() => ({ data: null })),
      ]);
      const payload = tripsRes.data as unknown;
      const rawList: unknown[] = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as Record<string, unknown>)?.data)
          ? ((payload as Record<string, unknown>).data as unknown[])
          : [];
      setTrips(
        rawList
          .map((t) => normalizeTrip(t as Record<string, unknown>))
          .filter((t) => t.status !== 'CANCELLED'),
      );
      setUserPhotoUrl(getResolvedProfilePhotoUrl((profileRes.data ?? {}) as Record<string, unknown>));
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
    }, [loadTrips]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTrips();
  }, [loadTrips]);

  const filteredTrips = useMemo(
    () => filterTrips(trips, activeFilter, searchQuery),
    [trips, activeFilter, searchQuery],
  );

  const heroTrip = useMemo(() => {
    if (activeFilter !== 'upcoming') return null;
    return filteredTrips.find((t) => t.status === 'ACTIVE') ?? filteredTrips[0] ?? null;
  }, [activeFilter, filteredTrips]);

  const listTrips = useMemo(() => {
    if (!heroTrip) return filteredTrips;
    return filteredTrips.filter((t) => t.id !== heroTrip.id);
  }, [filteredTrips, heroTrip]);

  const openTrip = (tripId: string) => {
    router.push({ pathname: '/trip-detail', params: { tripId } });
  };

  const renderHeroCard = (trip: TripCardData) => {
    const days = countTripDays(trip.startDate, trip.endDate);
    const isActive = trip.status === 'ACTIVE';
    return (
      <TouchableOpacity
        key={trip.id}
        style={[styles.heroCard, HERO_SHADOW]}
        onPress={() => openTrip(trip.id)}
        activeOpacity={0.92}
      >
        <View style={styles.heroImageWrap}>
          <TripCoverImage
            destination={trip.destination}
            containerStyle={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroGradient} />
          {isActive ? (
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>Active Now</Text>
            </View>
          ) : null}
          <View style={styles.heroBottom}>
            <Text style={styles.heroTitle}>{getTripTitle(trip.destination)}</Text>
            <View style={styles.heroMetaRow}>
              <Feather name="calendar" size={11} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroMeta}>
                {formatTripDateRange(trip.startDate, trip.endDate)} • {days} Days
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.heroFooter, { borderLeftColor: GREEN }]}>
          <TouchableOpacity
            style={styles.viewDetailsBtn}
            onPress={() => openTrip(trip.id)}
            activeOpacity={0.85}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCompactCard = (trip: TripCardData, index: number) => {
    const days = countTripDays(trip.startDate, trip.endDate);
    return (
      <TouchableOpacity
        key={trip.id}
        style={[styles.compactCard, CARD_SHADOW]}
        onPress={() => openTrip(trip.id)}
        activeOpacity={0.88}
      >
        <TripCoverImage destination={trip.destination} containerStyle={styles.compactThumb} />
        <View style={styles.compactBody}>
          <Text style={styles.compactEyebrow}>{getRelativeLabel(trip.startDate)}</Text>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {getTripTitle(trip.destination)}
          </Text>
          <Text style={styles.compactMeta}>
            {formatTripDateRange(trip.startDate, trip.endDate)} • {days} Days
          </Text>
          <View style={styles.compactFooter}>
            <UserAvatar photoUrl={userPhotoUrl} size={24} />
            <Feather name="chevron-right" size={14} color={GREY} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && trips.length === 0) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: top }]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading trips...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>My Trips</Text>
            <Text style={styles.subtitle}>Manage your upcoming adventures</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.85}
            style={styles.avatarBtn}
          >
            <UserAvatar photoUrl={userPhotoUrl} size={40} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabScrollBottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <View style={styles.searchIconWrap}>
              <Feather name="search" size={14} color={GREY} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search your trips..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_TABS.map((tab) => {
              const active = activeFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.filterTab}
                  onPress={() => setActiveFilter(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                    {tab.label}
                  </Text>
                  {active ? <View style={styles.filterDot} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh}>
              <Text style={styles.retryLink}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.feed}>
          {filteredTrips.length === 0 && !error ? (
            <View style={[styles.emptyBox, CARD_SHADOW]}>
              <Text style={styles.emptyText}>No trips in this category. Plan one from Home!</Text>
            </View>
          ) : (
            <>
              {heroTrip ? renderHeroCard(heroTrip) : null}
              {listTrips.map((trip, i) => renderCompactCard(trip, i))}
            </>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight + 16 }]}
        onPress={() => router.push('/new-trip')}
        activeOpacity={0.9}
      >
        <Feather name="plus" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: GREY, marginTop: 12, fontSize: 14 },
  header: { paddingHorizontal: 24, paddingBottom: 8, backgroundColor: BG, zIndex: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 28, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: GREY, marginTop: 4 },
  avatarBtn: { marginTop: 4 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarFallback: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  searchSection: { marginBottom: 24, gap: 24 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 999,
    padding: 8,
    paddingRight: 16,
    borderWidth: 1,
    borderColor: '#F9FAFB',
    ...CARD_SHADOW,
  },
  searchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT, fontWeight: '500', paddingHorizontal: 12 },
  filterRow: { gap: 24, paddingBottom: 4 },
  filterTab: { alignItems: 'center', paddingBottom: 8 },
  filterTabText: { fontSize: 14, fontWeight: '500', color: GREY },
  filterTabTextActive: { fontWeight: '700', color: GREEN },
  filterDot: {
    position: 'absolute',
    bottom: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: { color: '#EF4444', textAlign: 'center', marginBottom: 8 },
  retryLink: { color: GREEN, fontWeight: '600', fontSize: 14 },
  feed: { gap: 24 },
  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: GREY, textAlign: 'center', lineHeight: 20 },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  heroImageWrap: { height: 192, position: 'relative', backgroundColor: '#E5E7EB' },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  activeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...CARD_SHADOW,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroBottom: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 6 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMeta: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.9)' },
  heroFooter: {
    padding: 20,
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  viewDetailsBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  viewDetailsText: { fontSize: 12, fontWeight: '700', color: GREEN },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  compactThumb: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  compactBody: { flex: 1, minWidth: 0 },
  compactEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  compactTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 4 },
  compactMeta: { fontSize: 12, color: GREY, marginBottom: 10 },
  compactFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compactAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  compactAvatarImg: { width: '100%', height: '100%' },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 30,
  },
});
