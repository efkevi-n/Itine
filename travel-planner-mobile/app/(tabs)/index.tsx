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
import { OfflineBanner } from "@/components/OfflineBanner";
import { useConnectivity } from "@/hooks/useConnectivity";
import { getAccessToken, clearTokens } from "@/utils/auth";
import {
  cacheTrip,
  getCachedTrip,
  getCachedTripIds,
} from "@/utils/offlineCache";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#38bdf8",
  ACTIVE: "#22c55e",
  COMPLETED: "#94a3b8",
  CANCELLED: "#ef4444",
};

function normalizeTrip(raw: Record<string, unknown>): TripCardData {
  const id = String(raw.id ?? raw.tripId ?? "");
  const destination = String(raw.destination ?? "");
  const startDate = String(raw.startDate ?? raw.start_date ?? "");
  const endDate = String(raw.endDate ?? raw.end_date ?? "");
  const totalBudget = Number(raw.totalBudget ?? raw.total_budget ?? 0);
  const currency = String(raw.currency ?? "USD");
  const status = String(
    raw.status ?? "PENDING",
  ).toUpperCase() as TripCardData["status"];
  const validStatus: TripCardData["status"][] = [
    "PENDING",
    "CONFIRMED",
    "ACTIVE",
    "COMPLETED",
    "CANCELLED",
  ];
  return {
    id,
    destination,
    startDate,
    endDate,
    totalBudget,
    currency,
    status: validStatus.includes(status) ? status : "PENDING",
  };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "GOOD MORNING";
  if (h < 18) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

function getRelativeTripTime(startDate: string): string {
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return "Schedule unavailable";
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const dayDiff = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
  return diffMs >= 0 ? `${dayDiff} days left` : `${dayDiff} days ago`;
}

function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const year = endDate ? new Date(endDate).getFullYear() : "";
  return `${fmt(startDate)} - ${fmt(endDate)}${year ? `, ${year}` : ""}`;
}

const statFeatherName = (label: string): keyof typeof Feather.glyphMap => {
  if (label === "Total Trips") return "map";
  if (label === "Active") return "activity";
  return "check-circle";
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
  const { isOnline } = useConnectivity();
  const [userName, setUserName] = useState<string>("");
  const [trips, setTrips] = useState<TripCardData[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<TripCardData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const checkAuthAndFetch = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setError(null);
    try {
      const [profileRes, tripsRes] = await Promise.all([
        userApi.getProfile(),
        tripsApi.getAll({ page: 1, limit: 10 }),
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
      const e = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (e?.response?.status === 401) {
        await clearTokens();
        router.replace("/login");
        return;
      }
      if (!isOnline) {
        const ids = await getCachedTripIds();
        const cached: TripCardData[] = [];
        for (const id of ids) {
          const c = await getCachedTrip(id);
          if (c?.data)
            cached.push(normalizeTrip(c.data as Record<string, unknown>));
        }
        if (cached.length > 0) {
          setTrips(cached);
          setFilteredTrips(cached);
          setError(null);
        } else setError("Offline. No cached trips.");
      } else {
        setError(
          e?.response?.data?.message ?? "Failed to load. Pull to refresh.",
        );
      }
      setUserName((prev) => prev || "Traveler");
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
          if (!cancelled) router.replace("/login");
          return;
        }
        setLoading(true);
        setTripsLoading(true);
        await checkAuthAndFetch();
      })();
      return () => {
        cancelled = true;
      };
    }, [checkAuthAndFetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAuthAndFetch();
  };

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
      label: "Active",
      value: trips.filter((t) => t.status === "ACTIVE").length,
      accent: "#22c55e",
    },
    {
      label: "Completed",
      value: trips.filter((t) => t.status === "COMPLETED").length,
      accent: "#94a3b8",
    },
  ];

  if (loading && !userName) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color="#6366f1" />
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
      >
        <OfflineBanner visible={!isOnline} />

        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{userName || "Traveler"}</Text>
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
            style={styles.filterBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="sliders" size={16} color="#6366f1" />
          </TouchableOpacity>
        </View>

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
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          {quickStats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View
                style={[
                  styles.statIconWrap,
                  { borderColor: `${stat.accent}40` },
                ]}
              >
                <Feather
                  name={statFeatherName(stat.label)}
                  size={18}
                  color={stat.accent}
                />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionEyebrow}>Your itinerary</Text>
          <Text style={styles.sectionTitle}>Your Trips</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : tripsLoading && trips.length === 0 ? (
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

              <View style={styles.cardDetailsRow}>
                <View style={styles.detailColumn}>
                  <View style={styles.detailLabelRow}>
                    <Feather name="calendar" size={10} color="#4b5563" />
                    <Text style={styles.detailLabel}>Dates</Text>
                  </View>
                  <View style={styles.detailPill}>
                    <Text style={styles.detailValue}>
                      {formatDateRange(trip.startDate, trip.endDate)}
                    </Text>
                  </View>
                  <Text style={styles.daysMeta}>
                    {getRelativeTripTime(trip.startDate)}
                  </Text>
                </View>
                <View style={styles.detailColumn}>
                  <View style={styles.detailLabelRow}>
                    <Feather name="dollar-sign" size={10} color="#4b5563" />
                    <Text style={styles.detailLabel}>Budget</Text>
                  </View>
                  <View style={styles.detailPill}>
                    <Text style={styles.detailValue}>
                      {trip.currency} {trip.totalBudget.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.arrowButton}>
                  <Feather name="chevron-right" size={16} color="#6366f1" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0d0d14" },
  centered: { justifyContent: "center", alignItems: "center" },
  glowOrb: { position: "absolute", borderRadius: 999 },
  glowOrbTop: {
    width: 400,
    height: 400,
    top: -120,
    right: -100,
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  glowOrbBottom: {
    width: 300,
    height: 300,
    bottom: -100,
    left: -80,
    backgroundColor: "rgba(99,102,241,0.06)",
  },
  scroll: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 58,
    paddingBottom: 56,
  },
  header: {
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTextBlock: { flex: 1, paddingRight: 12 },
  greeting: {
    fontSize: 10,
    color: "#4b5563",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  userName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 6,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#13131f",
    borderWidth: 2,
    borderColor: "rgba(99,102,241,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#6366f1", fontWeight: "700", fontSize: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 20,
    backgroundColor: "#13131f",
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
  ctaRow: { flexDirection: "row", alignItems: "center" },
  ctaText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 10,
  },
  statsRow: { paddingBottom: 28, gap: 12 },
  statCard: {
    minWidth: 100,
    backgroundColor: "#13131f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  statValue: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
  },
  statLabel: {
    color: "#4b5563",
    marginTop: 4,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  sectionTitleWrap: { marginBottom: 18 },
  sectionEyebrow: {
    fontSize: 10,
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "600",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 12,
    padding: 16,
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
  emptyText: { color: "#4b5563", fontSize: 16, textAlign: "center" },
  card: {
    backgroundColor: "#13131f",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  cardPinIcon: { marginRight: 8 },
  destination: { fontSize: 18, fontWeight: "700", color: "#ffffff", flex: 1 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  detailColumn: { flex: 1 },
  detailLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 10,
    color: "#4b5563",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  detailPill: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  detailValue: { fontSize: 13, color: "#ffffff", fontWeight: "500" },
  daysMeta: { marginTop: 8, fontSize: 11, color: "#6b7280" },
  cardFooter: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.25)",
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
