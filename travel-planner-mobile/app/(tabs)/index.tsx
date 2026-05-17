import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TextInput,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { userApi } from "@/api/user";
import { tripsApi } from "@/api/trips";
import { TripCard, type TripCardData } from "@/components/TripCard";
import { Toast } from "@/components/Toast";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useToastStore } from "@/utils/toast";
import { getAccessToken, clearTokens } from "@/utils/auth";
import {
  getRawList,
  normalizeTrip,
  getCity,
  STATUS_COLORS,
  formatDateRange,
} from '@/utils/homeHelpers';
import { UserAvatar } from '@/components/UserAvatar';
import { TripCoverImage } from '@/components/TripCoverImage';
import { getResolvedProfilePhotoUrl, mapProfileToView } from '@/utils/profileMappers';

type RawRecord = Record<string, unknown>;

const BG = '#F8F8F6';
const TEXT = '#1F2937';
const GREEN = '#10B981';
const GREY = '#6B7280';
const LIGHT_GRAY = '#F3F4F6';
const BORDER = '#F3F4F6';
const PENDING_DOT = '#FACD3D';

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 3,
};

function formatBudget(currency: string, amount: number): string {
  const sym =
    currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
  return `${sym}${amount.toLocaleString()}`;
}

function formatStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusDotColor(status: string): string {
  if (status === 'PENDING') return PENDING_DOT;
  return STATUS_COLORS[status] ?? GREEN;
}

function getCountry(destination: string): string {
  const parts = destination.split(',').map((p) => p.trim());
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

function getTripCardTitle(destination: string): string {
  const city = getCity(destination);
  return city ? `${city} Adventure` : destination;
}

function getCompactSubtitle(trip: TripCardData): string {
  return `${getCountry(trip.destination)} • ${formatDateRange(trip.startDate, trip.endDate)}`;
}

type HomeTripFilter = 'all' | 'upcoming' | 'active' | 'completed';
type QuickStatKey = 'total' | 'active' | 'completed';

const QUICK_STAT_TO_FILTER: Record<QuickStatKey, HomeTripFilter> = {
  total: 'all',
  active: 'active',
  completed: 'completed',
};

function SkeletonLoader() {
  const skeletons = [0, 1, 2];
  return (
    <>
      {skeletons.map((idx) => (
        <SkeletonCard key={idx} />
      ))}
    </>
  );
}

function SkeletonCard() {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeletonCard,
        { opacity: pulseAnim },
      ]}
    >
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonBadge} />
      </View>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonLineSmall} />
        <View style={styles.skeletonLineSmall} />
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isOnline } = useConnectivity();
  const toastMessage = useToastStore((state) => state.message);
  const toastType = useToastStore((state) => state.type);
  const toastVisible = useToastStore((state) => state.visible);
  const hideToast = useToastStore((state) => state.hide);
  const [userName, setUserName] = useState<string>("");
  const [trips, setTrips] = useState<TripCardData[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<TripCardData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tripFilter, setTripFilter] = useState<HomeTripFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (error) {
      useToastStore.getState().show(error, "error", 4000);
      setError(null);
    }
  }, [error]);

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
        tripsApi.getAll({ page: 1, limit: 50 }),
      ]);

      const profile = ((
        profileRes.data as {
          user?: { name?: string; firstName?: string; email?: string };
          name?: string;
          firstName?: string;
          email?: string;
        }
      )?.user ?? profileRes.data) as
        | { name?: string; firstName?: string; email?: string }
        | undefined;
      const name =
        (profile?.name ??
          profile?.firstName ??
          (profile?.email ? profile.email.split("@")[0] : "")) ||
        "Traveler";
      setUserName(name);

      const payload = tripsRes.data as unknown;
      console.log('TRIPS API RESPONSE:', JSON.stringify(payload, null, 2));
      const list: Record<string, unknown>[] = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as Record<string, unknown>)?.data)
          ? (payload as Record<string, unknown>).data as Record<string, unknown>[]
          : [];
      const normalized = list.map((t: Record<string, unknown>) =>
        normalizeTrip(t),
      );
      setTrips(normalized);
      setFilteredTrips(normalized);
      setSearchQuery("");
      for (const t of list as Record<string, unknown>[]) {
        const id = String(t?.id ?? t?.tripId ?? "");
        if (id) cacheTrip(id, t).catch(() => {});
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e?.response?.status === 401) {
        await clearTokens();
        router.replace('/login');
        return;
      }
      if (!isOnline) {
        const ids = await getCachedTripIds();
        const cached: TripCardData[] = [];
        for (const id of ids) {
          const c = await getCachedTrip(id);
          if (c?.data) cached.push(normalizeTrip(c.data as RawRecord));
        }
        if (cached.length > 0) {
          setTrips(cached);
          setFilteredTrips(cached);
          setError(null);
        } else setError("Offline. No cached trips.");
      } else {
        setError(e?.response?.data?.message ?? 'Failed to load. Pull to refresh.');
      }
      setUserName((prev) => prev || 'Traveler');
    } finally {
      setLoading(false);
      setTripsLoading(false);
      setRefreshing(false);
    }
  }, [isOnline, router]);

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
      return () => {
        cancelled = true;
      };
    }, [checkAuthAndFetch, router]),
  );

  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = trips;
    if (q) {
      list = list.filter((t) => t.destination.toLowerCase().includes(q));
    }
    return filterTripsByTab(list, tripFilter);
  }, [trips, searchQuery, tripFilter]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredTrips(trips);
    } else {
      const lowerQuery = query.toLowerCase();
      setFilteredTrips(
        trips.filter((t) =>
          t.destination.toLowerCase().includes(lowerQuery),
        ),
      );
    }
  }, [trips]);

  const userInitials = userName ? userName.slice(0, 2).toUpperCase() : "TR";
  const quickStats = [
    { label: "Total Trips", value: trips.length, accent: "#3b82f6" },
    {
      key: 'active',
      label: 'Active',
      value: trips.filter((t) => t.status === 'ACTIVE').length,
    },
    {
      key: 'completed',
      label: 'Completed',
      value: trips.filter((t) => t.status === 'COMPLETED').length,
    },
  ];

  const handleQuickStatPress = useCallback((key: QuickStatKey) => {
    setTripFilter(QUICK_STAT_TO_FILTER[key]);
    setShowFilters(true);
  }, []);

  const openTrip = (tripId: string) => {
    router.push({ pathname: '/trip-detail', params: { tripId } });
  };

  const renderFullTripCard = (trip: TripCardData, index: number, showFooter: boolean) => {
    const dotColor = getStatusDotColor(trip.status);
    return (
      <TouchableOpacity
        key={trip.id}
        style={[s.tripCard, CARD_SHADOW]}
        onPress={() => openTrip(trip.id)}
        activeOpacity={0.92}
      >
        <View style={s.tripImageWrap}>
          <TripCoverImage
            destination={trip.destination}
            containerStyle={StyleSheet.absoluteFillObject}
          />
          <View style={s.tripImageGradientTop} />
          <View style={s.tripImageGradientBottom} />
          <View style={s.tripImageTopRow}>
            <View style={s.tripStatusPill}>
              <View style={[s.statusDot, { backgroundColor: dotColor }]} />
              <Text style={s.tripStatusText}>{formatStatus(trip.status)}</Text>
            </View>
            <View style={s.tripPricePill}>
              <Text style={s.tripPriceText}>{formatBudget(trip.currency, trip.totalBudget)}</Text>
            </View>
          </View>
        </View>

        <View style={s.tripBody}>
          <Text style={s.tripTitle}>{getTripCardTitle(trip.destination)}</Text>
          <View style={s.tripMetaRow}>
            <View style={s.tripMetaItem}>
              <Feather name="map-pin" size={13} color={`${GREY}99`} />
              <Text style={s.tripMetaText}>{getCountry(trip.destination)}</Text>
            </View>
            <View style={s.tripMetaItem}>
              <Feather name="calendar" size={13} color={`${GREY}99`} />
              <Text style={s.tripMetaText}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
            </View>
          </View>

          {showFooter ? (
            <View style={s.tripFooter}>
              <View style={s.avatarStack}>
                <UserAvatar photoUrl={userPhotoUrl} name={userName} size={24} style={s.stackAvatar} />
                <View style={[s.stackAvatar, s.stackAvatarFallback, s.stackAvatarOffset]}>
                  <Feather name="users" size={12} color={GREY} />
                </View>
              </View>
              <TouchableOpacity style={s.tripArrowBtn} activeOpacity={0.8}>
                <Feather
                  name="arrow-right"
                  size={16}
                  color={TEXT}
                  style={{ transform: [{ rotate: '-45deg' }] }}
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCompactTripCard = (trip: TripCardData, index: number) => (
    <TouchableOpacity
      key={trip.id}
      style={[s.compactCard, CARD_SHADOW, s.compactCardMuted]}
      onPress={() => openTrip(trip.id)}
      activeOpacity={0.88}
    >
      <TripCoverImage destination={trip.destination} containerStyle={s.compactThumb} />
      <View style={s.compactBody}>
        <View style={s.compactTitleRow}>
          <Text style={s.compactTitle} numberOfLines={1}>
            {getTripCardTitle(trip.destination)}
          </Text>
          <View style={s.compactStatusBadge}>
            <Text style={s.compactStatusText}>{formatStatus(trip.status)}</Text>
          </View>
        </View>
        <Text style={s.compactSubtitle} numberOfLines={1}>
          {getCompactSubtitle(trip)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !userName) {
    return (
      <View style={[s.screen, s.centered]}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.glowOrb, styles.glowOrbTop]} pointerEvents="none" />
      <View
        style={[styles.glowOrb, styles.glowOrbBottom]}
        pointerEvents="none"
      />

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onDismiss={hideToast}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              checkAuthAndFetch();
            }}
            tintColor={GREEN}
          />
        }
      >
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <OfflineBanner visible={!isOnline} />

          <View style={s.headerTop}>
            <View style={s.headerText}>
              <Text style={s.greeting}>Welcome back,</Text>
              <Text style={s.userName}>{userName || 'Traveler'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.85}
              accessibilityLabel="Open profile"
            >
              <View style={s.avatarRing}>
                <UserAvatar photoUrl={userPhotoUrl || null} name={userName} size={44} />
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/profile");
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.avatarText}>{userInitials}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Feather
            name="search"
            size={16}
            color="#4b5563"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search destinations..."
            placeholderTextColor="#4b5563"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={[s.planBtn, CARD_SHADOW]}
            onPress={() => router.push('/new-trip')}
            activeOpacity={0.92}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={s.planBtnText}>Plan a New Trip</Text>
          </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/new-trip");
          }}
          activeOpacity={0.9}
        >
          <Animated.View
            style={[
              styles.ctaPulseRing,
              {
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 0.08],
                }),
                transform: [
                  {
                    scale: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.06],
                    }),
                  },
                ],
              },
            ]}
          />
          <View style={styles.ctaRow}>
            <Feather name="map" size={18} color="#ffffff" />
            <Text style={styles.ctaText}>Plan a New Trip</Text>
          </View>

        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionEyebrow}>Your itinerary</Text>
          <Text style={styles.sectionTitle}>Your Trips</Text>
        </View>

        {tripsLoading && trips.length === 0 ? (
          <SkeletonLoader />
        ) : trips.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather
              name="map"
              size={64}
              color="rgba(99,102,241,0.3)"
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>
              Plan your first adventure and it will appear here
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/new-trip");
              }}
            >
              <Text style={styles.emptyButtonText}>Plan a Trip</Text>
            </TouchableOpacity>
          </View>
        ) : filteredTrips.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No trips match your search.
            </Text>
          </View>
        ) : (
          filteredTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={[
                styles.card,
                {
                  borderLeftWidth: 3,
                  borderLeftColor: STATUS_COLORS[trip.status] ?? "#6366f1",
                },
              ]}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/trip-detail",
                  params: { tripId: trip.id },
                });
              }}
              activeOpacity={0.88}
            >
              <View style={styles.cardHeader}>
                <View style={styles.destinationRow}>
                  <Feather
                    name="map-pin"
                    size={14}
                    color="#6366f1"
                    style={styles.cardPinIcon}
                  />
                  <Text style={styles.destination}>{trip.destination}</Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: `${
                        STATUS_COLORS[trip.status] ?? "#6366f1"
                      }22`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: STATUS_COLORS[trip.status] ?? "#6366f1" },
                    ]}
                  >
                    {trip.status}
                  </Text>
                </View>
              </View>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : tripsLoading && trips.length === 0 ? (
            <ActivityIndicator color={GREEN} style={s.spinner} />
          ) : trips.length === 0 ? (
            <View style={[s.emptyBox, CARD_SHADOW]}>
              <Text style={s.emptyTitle}>No trips yet</Text>
              <Text style={s.emptyText}>
                Plan your first trip and your travel wallet will appear here.
              </Text>
            </View>
          ) : filteredTrips.length === 0 ? (
            <View style={[s.emptyBox, CARD_SHADOW]}>
              <Text style={s.emptyTitle}>No matching trips</Text>
              <Text style={s.emptyText}>Try a different search or filter.</Text>
            </View>
          ) : (
            <View style={s.tripList}>
              {fullTripCards.map((trip, i) => renderFullTripCard(trip, i, i === 0))}
              {compactTripCards.map((trip, i) => renderCompactTripCard(trip, i))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...CARD_SHADOW,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: { flex: 1, paddingRight: 12 },
  greeting: {
    fontSize: 12,
    color: GREY,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  userName: { fontSize: 24, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: {
    flex: 1,
    backgroundColor: LIGHT_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: GREEN, fontWeight: '700', fontSize: 15 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 244, 246, 0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    paddingRight: 16,
  },
  searchIcon: { marginLeft: 16, marginRight: 4 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT, padding: 0, fontWeight: '400' },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: "#ffffff", fontSize: 15 },
  filterBtn: { padding: 4, justifyContent: "center", alignItems: "center" },
  ctaButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#6366f1",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    overflow: "visible",
    position: "relative",
  },
  ctaPulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(99,102,241,0.45)",
  },
  main: { paddingHorizontal: 24, paddingTop: 24, gap: 0 },
  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 32,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  planBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statCardActive: {
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  statTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: GREEN,
  },
  statLabel: {
    fontSize: 10,
    color: GREY,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: TEXT },
  statValueActive: { color: GREEN },
  tripsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: { color: "#f87171", textAlign: "center" },
  loadingBox: { alignItems: "center", paddingVertical: 32 },
  emptyBox: {
    backgroundColor: "#13131f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  tripImageWrap: { height: 128, width: '100%', position: 'relative', backgroundColor: '#E5E7EB' },
  tripImageGradientTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  tripImageGradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tripImageTopRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    ...CARD_SHADOW,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  tripStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tripPricePill: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tripPriceText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tripBody: { padding: 20 },
  tripTitle: { fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 4 },
  tripMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
  tripMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripMetaText: { fontSize: 13, color: GREY, fontWeight: '400' },
  tripFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  stackAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  stackAvatarFallback: {
    backgroundColor: LIGHT_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatarOffset: { marginLeft: -8 },
  stackAvatarText: { fontSize: 10, fontWeight: '700', color: GREEN },
  tripArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(243, 244, 246, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  compactCardMuted: { opacity: 0.8 },
  compactThumb: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
  },
  compactBody: { flex: 1, minWidth: 0 },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  compactTitle: { fontSize: 15, fontWeight: '700', color: TEXT, flex: 1 },
  compactStatusBadge: {
    backgroundColor: LIGHT_GRAY,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  compactStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  compactSubtitle: { fontSize: 12, color: GREY },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 16, padding: 16, marginBottom: 16 },
  errorText: { color: '#EF4444', textAlign: 'center' },
  filterBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: LIGHT_GRAY,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: GREY },
  filterChipTextActive: { color: GREEN },
  spinner: { paddingVertical: 32 },
  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  skeletonCard: {
    backgroundColor: "#13131f",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 16,
    overflow: "hidden",
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  skeletonLine: {
    height: 18,
    width: "60%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
  },
  skeletonBadge: {
    height: 18,
    width: "25%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
  },
  skeletonContent: {
    gap: 8,
  },
  skeletonLineSmall: {
    height: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 6,
    marginBottom: 8,
  },
});
