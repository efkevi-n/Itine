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
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { userApi } from "@/api/user";
import { tripsApi } from "@/api/trips";
import { type TripCardData } from "@/components/TripCard";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useConnectivity } from "@/hooks/useConnectivity";
import { getAccessToken, clearTokens } from "@/utils/auth";
import {
  cacheTrip,
  getCachedTrip,
  getCachedTripIds,
} from "@/utils/offlineCache";
import { weatherApi, type WeatherSnapshot } from "@/services/weatherApi";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#38bdf8",
  ACTIVE: "#22c55e",
  COMPLETED: "#94a3b8",
  CANCELLED: "#ef4444",
};

interface TransportGuide {
  city: string;
  airport: string;
  systems: string[];
  taxi: string;
}

type RawRecord = Record<string, unknown>;

type WeatherLoadState =
  | { status: "loading" }
  | { status: "ready"; data: WeatherSnapshot }
  | { status: "error" };

const TRANSPORT_GUIDES: TransportGuide[] = [
  {
    city: "rome",
    airport: "Leonardo Express connects Fiumicino Airport with Roma Termini.",
    systems: ["Metro", "Leonardo Express", "regional rail"],
    taxi: "Use official white taxis from marked ranks.",
  },
  {
    city: "paris",
    airport: "RER B and airport buses connect CDG and Orly with central Paris.",
    systems: ["Metro", "RER", "tram"],
    taxi: "Use official taxis from signed airport and station ranks.",
  },
  {
    city: "istanbul",
    airport: "Havaist coaches and Metro links are common airport-to-city options.",
    systems: ["Metro", "Havaist", "Marmaray"],
    taxi: "Use official taxis or trusted app-based rides.",
  },
  {
    city: "london",
    airport: "Elizabeth line, Heathrow Express, Gatwick Express, and Underground links serve major airports.",
    systems: ["Underground", "Elizabeth line", "National Rail"],
    taxi: "Black cabs and licensed private-hire rides are widely used.",
  },
  {
    city: "tokyo",
    airport: "Airport rail links connect Narita and Haneda with major Tokyo hubs.",
    systems: ["JR", "Tokyo Metro", "airport rail"],
    taxi: "Taxis are reliable but usually best for shorter city transfers.",
  },
  {
    city: "amsterdam",
    airport: "Schiphol trains reach Amsterdam Centraal in a short direct ride.",
    systems: ["NS", "GVB", "Schiphol train"],
    taxi: "Use official taxi stands or trusted app-based rides.",
  },
  {
    city: "barcelona",
    airport: "Aerobus and Metro links connect the airport with central Barcelona.",
    systems: ["Metro", "Aerobus", "Rodalies"],
    taxi: "Official black-and-yellow taxis are available at airport ranks.",
  },
  {
    city: "ankara",
    airport: "Airport shuttles and EGO connections serve central Ankara routes.",
    systems: ["Metro", "EGO buses", "airport shuttle"],
    taxi: "Use official taxis from marked ranks.",
  },
];

function asRecord(value: unknown): value is RawRecord {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function getRawList(payload: unknown): RawRecord[] {
  const keys = ["data", "trips", "items", "results", "docs", "rows"];
  const visited = new Set<unknown>();

  const read = (value: unknown): RawRecord[] => {
    if (Array.isArray(value)) return value.filter(asRecord);
    if (!asRecord(value) || visited.has(value)) return [];

    visited.add(value);

    for (const key of keys) {
      const child = value[key];
      if (Array.isArray(child)) return child.filter(asRecord);
    }

    for (const key of keys) {
      const child = value[key];
      const nested = read(child);
      if (nested.length > 0) return nested;
    }

    return [];
  };

  return read(payload);
}

function readString(raw: RawRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = raw[key];
    if (value != null && String(value).trim().length > 0) {
      return String(value).trim();
    }
  }
  return fallback;
}

function readNumber(raw: RawRecord, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function normalizeStatus(value: unknown): TripCardData["status"] {
  const status = String(value ?? "PENDING")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();

  if (status === "CANCELED") return "CANCELLED";
  if (["ACTIVE", "IN_PROGRESS", "ONGOING"].includes(status)) return "ACTIVE";
  if (["CONFIRMED", "BOOKED", "APPROVED", "UPCOMING"].includes(status)) return "CONFIRMED";
  if (["COMPLETED", "COMPLETE", "FINISHED"].includes(status)) return "COMPLETED";
  if (["CANCELLED", "CANCELED", "VOID"].includes(status)) return "CANCELLED";
  return "PENDING";
}

function getTripTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day), 12).getTime();
  }

  const time = new Date(trimmed).getTime();
  return Number.isNaN(time) ? null : time;
}

function normalizeTrip(raw: RawRecord): TripCardData {
  const id = readString(raw, ["id", "tripId", "trip_id", "_id"]);
  const destination = readString(raw, ["destination", "destinationName", "location"]);
  const startDate = readString(raw, ["startDate", "start_date", "departureDate", "departure_date", "fromDate", "from_date"]);
  const endDate = readString(raw, ["endDate", "end_date", "returnDate", "return_date", "toDate", "to_date"]);
  const totalBudget = readNumber(raw, ["totalBudget", "total_budget", "budget"]);
  const currency = readString(raw, ["currency"], "USD");
  const status = normalizeStatus(raw.status ?? raw.tripStatus ?? raw.state);

  return {
    id,
    destination,
    startDate,
    endDate,
    totalBudget,
    currency,
    status,
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
  if (dayDiff === 0) return "Today";
  return diffMs >= 0 ? `${dayDiff} days left` : `${dayDiff} days ago`;
}

function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (d: string) => {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "TBD";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const year = endDate ? new Date(endDate).getFullYear() : "";
  return `${fmt(startDate)} - ${fmt(endDate)}${year ? `, ${year}` : ""}`;
}

function getCity(destination: string): string {
  return destination.split(",")[0]?.trim() || destination || "Destination";
}

function getTransportGuide(destination: string): TransportGuide {
  const normalized = destination.toLowerCase();
  return (
    TRANSPORT_GUIDES.find((guide) => normalized.includes(guide.city)) ?? {
      city: getCity(destination),
      airport: "Check official airport and city transit guidance before departure.",
      systems: ["Public transit", "airport transfer", "official taxis"],
      taxi: "Use licensed taxis, hotel-arranged transfers, or trusted ride apps.",
    }
  );
}

function getUpcomingTrips(trips: TripCardData[]): TripCardData[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();

  return [...trips]
    .filter((trip) => {
      if (trip.status === "CANCELLED" || trip.status === "COMPLETED") return false;
      if (trip.status === "ACTIVE") return true;

      const endTime = getTripTime(trip.endDate);
      const startTime = getTripTime(trip.startDate);

      if (endTime != null) return endTime >= today;
      if (startTime != null) return startTime >= today;
      return true;
    })
    .sort((a, b) => {
      const aTime = getTripTime(a.startDate) ?? Number.MAX_SAFE_INTEGER;
      const bTime = getTripTime(b.startDate) ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
}

function statFeatherName(label: string): keyof typeof Feather.glyphMap {
  if (label === "Total Trips") return "map";
  if (label === "Active") return "activity";
  return "check-circle";
}

function weatherKey(city: string): string {
  return city.trim().toLowerCase();
}

function formatTemperature(value: number): string {
  return `${Math.round(value)} C`;
}

function getWeatherIconUri(icon: string): string | undefined {
  const trimmed = icon.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://openweathermap.org/img/wn/${encodeURIComponent(trimmed)}@2x.png`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { isOnline } = useConnectivity();
  const [userName, setUserName] = useState<string>("");
  const [trips, setTrips] = useState<TripCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [weatherByCity, setWeatherByCity] = useState<Record<string, WeatherLoadState>>({});
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

      const list = getRawList(tripsRes.data);
      const normalized = list.map(normalizeTrip);
      setTrips(normalized);
      for (const t of list) {
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
            cached.push(normalizeTrip(c.data as RawRecord));
        }
        if (cached.length > 0) {
          setTrips(cached);
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
    }, [checkAuthAndFetch, router]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAuthAndFetch();
  };

  const userInitials = userName ? userName.slice(0, 2).toUpperCase() : "TR";
  const upcomingTrips = useMemo(() => getUpcomingTrips(trips), [trips]);
  const nextTrip = upcomingTrips[0];
  const weatherTrips = useMemo(() => upcomingTrips.slice(0, 3), [upcomingTrips]);
  const transportTrips = useMemo(() => upcomingTrips.slice(0, 2), [upcomingTrips]);
  const weatherCities = useMemo(() => {
    const seen = new Set<string>();
    return weatherTrips
      .map((trip) => getCity(trip.destination))
      .filter((city) => {
        const key = weatherKey(city);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [weatherTrips]);
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

  useEffect(() => {
    if (weatherCities.length === 0) {
      setWeatherByCity({});
      return undefined;
    }

    if (!isOnline) return undefined;

    let cancelled = false;
    setWeatherByCity((current) => {
      const next = { ...current };
      for (const city of weatherCities) {
        const key = weatherKey(city);
        if (next[key]?.status !== "ready") next[key] = { status: "loading" };
      }
      return next;
    });

    Promise.all(
      weatherCities.map(async (city) => {
        try {
          const res = await weatherApi.getByCity(city);
          return { city, state: { status: "ready", data: res.data } as WeatherLoadState };
        } catch {
          return { city, state: { status: "error" } as WeatherLoadState };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setWeatherByCity((current) => {
        const next = { ...current };
        for (const result of results) {
          next[weatherKey(result.city)] = result.state;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isOnline, weatherCities]);

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
      <View style={[styles.glowOrb, styles.glowOrbBottom]} pointerEvents="none" />

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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroEyebrow}>NEXT JOURNEY</Text>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {nextTrip?.destination ?? "Ready when you are"}
          </Text>
          <Text style={styles.heroMeta}>
            {nextTrip
              ? `${formatDateRange(nextTrip.startDate, nextTrip.endDate)} - ${getRelativeTripTime(nextTrip.startDate)}`
              : "Build a polished itinerary and travel wallet for your next destination."}
          </Text>

          <View style={styles.heroFooter}>
            <View style={styles.heroStatusPill}>
              <Feather name={nextTrip ? "navigation" : "plus-circle"} size={14} color="#a5b4fc" />
              <Text style={styles.heroStatusText}>{nextTrip?.status ?? "NEW TRIP"}</Text>
            </View>
            <TouchableOpacity
              style={styles.heroDetailsButton}
              activeOpacity={0.86}
              disabled={!nextTrip}
              onPress={() => {
                if (nextTrip) {
                  router.push({ pathname: "/trip-detail", params: { tripId: nextTrip.id } });
                }
              }}
            >
              <Text style={[styles.heroDetailsText, !nextTrip && styles.heroDetailsDisabled]}>
                {nextTrip ? "Open" : "No trip yet"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push("/new-trip")}
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          {quickStats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View style={[styles.statIconWrap, { borderColor: `${stat.accent}40` }]}>
                <Feather name={statFeatherName(stat.label)} size={18} color={stat.accent} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionEyebrow}>Destination readiness</Text>
          <Text style={styles.sectionTitle}>Weather</Text>
        </View>

        {weatherTrips.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weatherRow}>
            {weatherTrips.map((trip) => {
              const city = getCity(trip.destination);
              const weather = weatherByCity[weatherKey(city)];
              const iconUri =
                weather?.status === "ready" ? getWeatherIconUri(weather.data.icon) : undefined;

              return (
                <View key={`weather-${trip.id}`} style={styles.weatherCard}>
                  <View style={styles.weatherIcon}>
                    {weather?.status === "loading" ? (
                      <ActivityIndicator color="#a5b4fc" size="small" />
                    ) : iconUri ? (
                      <Image source={{ uri: iconUri }} style={styles.weatherImage} />
                    ) : (
                      <Feather name="cloud-off" size={18} color="#a5b4fc" />
                    )}
                  </View>
                  <Text style={styles.weatherDestination} numberOfLines={1}>
                    {city}
                  </Text>
                  <Text style={styles.weatherStatus}>
                    {weather?.status === "ready"
                      ? formatTemperature(weather.data.temperature)
                      : weather?.status === "loading"
                        ? "Loading weather"
                        : "Weather unavailable"}
                  </Text>
                  <Text style={styles.weatherHint} numberOfLines={2}>
                    {weather?.status === "ready"
                      ? `${weather.data.condition} / ${weather.data.humidity}% humidity`
                      : "Try again when connected"}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.utilityEmpty}>
            <Feather name="cloud-off" size={18} color="#6b7280" />
            <Text style={styles.utilityEmptyText}>Weather cards appear when you have an upcoming trip.</Text>
          </View>
        )}

        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionEyebrow}>Arrival helper</Text>
          <Text style={styles.sectionTitle}>Transport guidance</Text>
        </View>

        {transportTrips.length > 0 ? (
          transportTrips.map((trip) => {
            const guide = getTransportGuide(trip.destination);
            return (
              <View key={`transport-${trip.id}`} style={styles.transportCard}>
                <View style={styles.transportHeader}>
                  <View>
                    <Text style={styles.transportCity}>{getCity(trip.destination)}</Text>
                    <Text style={styles.transportLabel}>Guidance only - not live availability</Text>
                  </View>
                  <View style={styles.transportIcon}>
                    <Feather name="navigation" size={17} color="#8b9cff" />
                  </View>
                </View>
                <Text style={styles.transportCopy}>{guide.airport}</Text>
                <View style={styles.systemRow}>
                  {guide.systems.map((system) => (
                    <View key={system} style={styles.systemPill}>
                      <Text style={styles.systemText}>{system}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.transportTaxi}>{guide.taxi}</Text>
              </View>
            );
          })
        ) : (
          <View style={styles.utilityEmpty}>
            <Feather name="navigation" size={18} color="#6b7280" />
            <Text style={styles.utilityEmptyText}>Transport tips appear when you have an upcoming trip.</Text>
          </View>
        )}

        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionEyebrow}>Your itinerary</Text>
          <Text style={styles.sectionTitle}>Your Trips</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : tripsLoading && trips.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#6366f1" />
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyText}>Plan your first trip and your travel wallet will appear here.</Text>
          </View>
        ) : (
          trips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={[
                styles.card,
                {
                  borderLeftWidth: 3,
                  borderLeftColor: STATUS_COLORS[trip.status] ?? "#6366f1",
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/trip-detail",
                  params: { tripId: trip.id },
                })
              }
              activeOpacity={0.88}
            >
              <View style={styles.cardHeader}>
                <View style={styles.destinationRow}>
                  <Feather name="map-pin" size={14} color="#6366f1" style={styles.cardPinIcon} />
                  <Text style={styles.destination}>{trip.destination}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${STATUS_COLORS[trip.status] ?? "#6366f1"}22` }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLORS[trip.status] ?? "#6366f1" }]}>
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
                    <Text style={styles.detailValue}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
                  </View>
                  <Text style={styles.daysMeta}>{getRelativeTripTime(trip.startDate)}</Text>
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
    backgroundColor: "rgba(20,184,166,0.07)",
  },
  scroll: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 58,
    paddingBottom: 56,
  },
  header: {
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTextBlock: { flex: 1, paddingRight: 12 },
  greeting: {
    fontSize: 10,
    color: "#64748b",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  userName: {
    fontSize: 32,
    fontWeight: "800",
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
  avatarText: { color: "#8b9cff", fontWeight: "800", fontSize: 14 },
  heroCard: {
    backgroundColor: "#151a27",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 26,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
    padding: 18,
  },
  heroGlow: {
    position: "absolute",
    right: -74,
    top: -86,
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: "rgba(99,102,241,0.2)",
  },
  heroEyebrow: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "900",
    marginBottom: 8,
  },
  heroMeta: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  heroFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  heroStatusPill: {
    alignItems: "center",
    backgroundColor: "rgba(139,156,255,0.14)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroStatusText: {
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: "900",
  },
  heroDetailsButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroDetailsText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  heroDetailsDisabled: {
    color: "#64748b",
  },
  ctaButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#6366f1",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    overflow: "visible",
    position: "relative",
  },
  ctaPulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(99,102,241,0.45)",
  },
  ctaRow: { flexDirection: "row", alignItems: "center" },
  ctaText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16,
    marginLeft: 10,
  },
  statsRow: { paddingBottom: 26, gap: 12 },
  statCard: {
    minWidth: 104,
    backgroundColor: "#13131f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 15,
    marginRight: 12,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  statValue: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 32,
  },
  statLabel: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    fontWeight: "800",
  },
  sectionTitleWrap: { marginBottom: 14, marginTop: 2 },
  sectionEyebrow: {
    fontSize: 10,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "800",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  weatherRow: { gap: 12, paddingBottom: 22 },
  weatherCard: {
    width: 172,
    backgroundColor: "#151a27",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
    padding: 15,
  },
  weatherIcon: {
    alignItems: "center",
    backgroundColor: "rgba(139,156,255,0.14)",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    marginBottom: 12,
    width: 38,
  },
  weatherImage: {
    height: 34,
    width: 34,
  },
  weatherDestination: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  weatherStatus: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "800",
  },
  weatherHint: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  utilityEmpty: {
    alignItems: "center",
    backgroundColor: "#13131f",
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
    padding: 15,
  },
  utilityEmptyText: {
    color: "#64748b",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  transportCard: {
    backgroundColor: "#151a27",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  transportHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  transportCity: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  transportLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  transportIcon: {
    alignItems: "center",
    backgroundColor: "rgba(139,156,255,0.14)",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  transportCopy: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  systemRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },
  systemPill: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  systemText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "800",
  },
  transportTaxi: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 12,
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
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  emptyText: { color: "#64748b", fontSize: 14, textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: "#13131f",
    borderRadius: 16,
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
  destination: { fontSize: 18, fontWeight: "800", color: "#ffffff", flex: 1 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  badgeText: { fontSize: 11, fontWeight: "800" },
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
    color: "#64748b",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  detailPill: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  detailValue: { fontSize: 13, color: "#ffffff", fontWeight: "600" },
  daysMeta: { marginTop: 8, fontSize: 11, color: "#6b7280", fontWeight: "700" },
  cardFooter: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.25)",
  },
});
