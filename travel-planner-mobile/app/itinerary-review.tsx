import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { tripsApi } from "@/api/trips";
import { itineraryApi } from "@/api/itinerary";
import { formatTripDateRange } from "@/utils/dateFormat";
import { scheduleTripReminder } from "@/utils/notifications";
import { saveNotification } from "@/utils/notificationStore";
import type { AppNotification } from "@/types/notification";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useConnectivity } from "@/hooks/useConnectivity";
import { cacheItinerary, getCachedItinerary } from "@/utils/offlineCache";
import { showToast } from "@/utils/toastStore";
import { getErrorMessage } from "@/utils/errorHandler";
import { SUCCESS_MESSAGES } from "@/constants/errors";
import { isBookedTripStatus } from "@/utils/tripStatus";
import { TripCoverImage } from "@/components/TripCoverImage";

const BG = "#F8F8F6";
const TEXT = "#1F2937";
const GREEN = "#10B981";
const GREY = "#6B7280";
const LIGHT_GRAY = "#F3F4F6";

const CHART_COLORS = ["#10B981", "#34D399", "#6EE7B7", "#A7F3D0"];

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
};

interface ActivityItem {
  name: string;
  cost: string;
  duration?: string;
}

interface DayItem {
  day: number;
  title: string;
  flight: { info: string; cost: string } | null;
  hotel: { name: string; type: string; cost: string };
  transport: { info: string; cost: string };
  activities: ActivityItem[];
  dayTotal: number;
}

interface BudgetItem {
  label: string;
  amount: number;
  color: string;
  emoji: string;
  icon: string;
  displayLabel: string;
}

interface TripSummary {
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency: string;
  status: string;
}

type FeatherName = keyof typeof Feather.glyphMap;

interface DayLineItem {
  icon: FeatherName;
  tag: string;
  title: string;
  cost: string;
  subtitle?: string;
}

const BUDGET_COLORS = {
  flights: {
    label: "Flights",
    displayLabel: "Flights",
    color: CHART_COLORS[0],
    emoji: "✈️",
    icon: "navigation",
  },
  accommodation: {
    label: "Accommodation",
    displayLabel: "Hotel",
    color: CHART_COLORS[1],
    emoji: "🏨",
    icon: "home",
  },
  activities: {
    label: "Activities",
    displayLabel: "Food/Act",
    color: CHART_COLORS[2],
    emoji: "🎭",
    icon: "tag",
  },
  transport: {
    label: "Transport",
    displayLabel: "Transport",
    color: CHART_COLORS[3],
    emoji: "🚗",
    icon: "truck",
  },
};

function parseNum(v: unknown): number {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

function formatMoney(amount: number, currency: string): string {
  const sym =
    currency === "USD"
      ? "$"
      : currency === "EUR"
      ? "€"
      : currency === "GBP"
      ? "£"
      : `${currency} `;
  return `${sym}${Math.round(amount).toLocaleString()}`;
}

function getDayDateLabel(startDate: string, dayIndex: number): string {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "";
  const d = new Date(start);
  d.setDate(d.getDate() + dayIndex);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function normalizeDay(raw: Record<string, unknown>, index: number): DayItem {
  const dayNum = index + 1;
  const flight = raw.flight as Record<string, unknown> | null | undefined;
  const hotel = (raw.hotel ?? raw.accommodation) as
    | Record<string, unknown>
    | undefined;
  const transport = raw.transport as Record<string, unknown> | undefined;
  const activitiesRaw = (raw.activities ?? []) as unknown[];

  const flightInfo =
    flight &&
    [flight.airline, flight.departure, flight.arrival, flight.info]
      .filter(Boolean)
      .join(" — ");
  const flightCost =
    flight && (flight.price != null || flight.cost != null)
      ? `$${parseNum(flight.price ?? flight.cost)}`
      : "$0";

  const hotelName = String(hotel?.["name"] ?? hotel?.["hotelName"] ?? "");
  const hotelType = String(hotel?.["type"] ?? hotel?.["roomType"] ?? "");
  const hotelCostVal = hotel?.["cost"] ?? hotel?.["pricePerNight"];
  const hotelCost =
    hotelCostVal != null
      ? `${
          typeof hotelCostVal === "string"
            ? hotelCostVal
            : `$${parseNum(hotelCostVal)}`
        }`
      : "—";

  const transportInfo =
    transport &&
    [transport.type, transport.from, transport.to, transport.info]
      .filter(Boolean)
      .join(" ");
  const transportCost =
    transport && (transport.price != null || transport.cost != null)
      ? `$${parseNum(transport.price ?? transport.cost)}`
      : "$0";

  const activities: ActivityItem[] = activitiesRaw.map((a: unknown) => {
    const x = a as Record<string, unknown>;
    return {
      name: String(x.name ?? ""),
      cost: x.cost != null ? `$${parseNum(x.cost)}` : "—",
      duration: x.duration != null ? String(x.duration) : undefined,
    };
  });

  let dayTotal =
    parseNum(flight?.price ?? flight?.cost) +
    parseNum(transport?.price ?? transport?.cost);
  activities.forEach((a) => {
    const m = String(a.cost).replace(/[^0-9.]/g, "");
    if (m) dayTotal += parseFloat(m) || 0;
  });
  const hotelPrice = hotel?.["pricePerNight"] ?? hotel?.["cost"];
  if (hotelPrice != null) dayTotal += parseNum(hotelPrice);

  return {
    day: dayNum,
    title: String(raw.title ?? `Day ${dayNum}`),
    flight:
      flight && (flightInfo || parseNum(flight.price ?? flight.cost) > 0)
        ? { info: flightInfo || "Flight", cost: flightCost }
        : null,
    hotel: { name: hotelName || "—", type: hotelType, cost: hotelCost },
    transport: { info: transportInfo || "—", cost: transportCost },
    activities,
    dayTotal,
  };
}

function buildBudgetFromDays(days: DayItem[]): BudgetItem[] {
  let flights = 0,
    accommodation = 0,
    activities = 0,
    transport = 0;
  days.forEach((d) => {
    if (d.flight) {
      const m = d.flight.cost.replace(/[^0-9.]/g, "");
      if (m) flights += parseFloat(m);
    }
    const hotelMatch = d.hotel.cost.match(/[\d.]+/);
    if (hotelMatch) accommodation += parseFloat(hotelMatch[0]);
    d.activities.forEach((a) => {
      const m = a.cost.replace(/[^0-9.]/g, "");
      if (m) activities += parseFloat(m);
    });
    const transMatch = d.transport.cost.replace(/[^0-9.]/g, "");
    if (transMatch) transport += parseFloat(transMatch);
  });
  return [
    { ...BUDGET_COLORS.flights, amount: Math.round(flights) },
    { ...BUDGET_COLORS.accommodation, amount: Math.round(accommodation) },
    { ...BUDGET_COLORS.activities, amount: Math.round(activities) },
    { ...BUDGET_COLORS.transport, amount: Math.round(transport) },
  ].filter((b) => b.amount > 0);
}

function getDayLineItems(day: DayItem): DayLineItem[] {
  const items: DayLineItem[] = [];
  if (day.flight) {
    items.push({
      icon: "navigation",
      tag: "Flight • 10:00 AM",
      title: day.flight.info,
      cost: day.flight.cost,
    });
  }
  if (day.hotel.name && day.hotel.name !== "—") {
    items.push({
      icon: "home",
      tag: "Hotel • 3:00 PM",
      title: day.hotel.name,
      cost: day.hotel.cost,
      subtitle: day.hotel.type || undefined,
    });
  }
  if (day.transport.info && day.transport.info !== "—") {
    items.push({
      icon: "truck",
      tag: "Transport • 2:00 PM",
      title: day.transport.info,
      cost: day.transport.cost,
    });
  }
  day.activities.forEach((a) => {
    if (!a.name) return;
    const isFood = /food|dining|meal|restaurant|ramen|cafe/i.test(a.name);
    items.push({
      icon: isFood ? "coffee" : "tag",
      tag: `${isFood ? "Dining" : "Activity"} • 10:00 AM`,
      title: a.name,
      cost: a.cost,
      subtitle: a.duration,
    });
  });
  return items;
}

export default function ItineraryReviewScreen() {
  const router = useRouter();
  const { insets, top, stackScrollBottom, contentPaddingHorizontal } = useScreenInsets();
  const { isOnline } = useConnectivity();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const [trip, setTrip] = useState<TripSummary | null>(null);
  const [itinerary, setItinerary] = useState<DayItem[]>([]);
  const [budgetBreakdown, setBudgetBreakdown] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);

  const loadData = useCallback(async () => {
    if (!tripId) {
      router.replace("/(tabs)");
      return;
    }
    setError(null);
    setLoading(true);
    setIsGenerating(false);
    try {
      const tripRes = await tripsApi.getById(tripId);
      const tripData =
        tripRes.data ?? (tripRes as { data?: Record<string, unknown> }).data;
      if (!tripData || typeof tripData !== "object") {
        setError("Failed to load trip.");
        setLoading(false);
        return;
      }
      setTrip({
        destination: String(tripData.destination ?? ""),
        startDate: String(tripData.startDate ?? tripData.start_date ?? ""),
        endDate: String(tripData.endDate ?? tripData.end_date ?? ""),
        totalBudget: parseNum(tripData.totalBudget ?? tripData.total_budget),
        currency: String(tripData.currency ?? "USD"),
        status: String(tripData.status ?? "PENDING").toUpperCase(),
      });

      const itineraryRes = await itineraryApi.getItinerary(tripId);
      const itineraryData =
        itineraryRes.data ?? (itineraryRes as { data?: unknown }).data;
      const rawDays = Array.isArray(
        (itineraryData as Record<string, unknown>)?.days,
      )
        ? (itineraryData as { days: Record<string, unknown>[] }).days
        : Array.isArray(itineraryData)
        ? itineraryData
        : [];
      const status = (itineraryData as Record<string, unknown>)?.status as
        | string
        | undefined;
      const generating =
        String(status ?? "").toLowerCase() === "generating" ||
        rawDays.length === 0;

      if (generating) {
        setIsGenerating(true);
        setItinerary([]);
        setBudgetBreakdown([]);
      } else {
        setIsGenerating(false);
        const days = rawDays.map((d, i) =>
          normalizeDay(d as Record<string, unknown>, i),
        );
        setItinerary(days);
        const breakdown =
          (itineraryData as Record<string, unknown>)?.budgetBreakdown ??
          (itineraryData as Record<string, unknown>)?.budget_breakdown;
        if (Array.isArray(breakdown) && breakdown.length > 0) {
          const map: Record<string, (typeof BUDGET_COLORS)["flights"]> = {
            flights: BUDGET_COLORS.flights,
            accommodation: BUDGET_COLORS.accommodation,
            activities: BUDGET_COLORS.activities,
            transport: BUDGET_COLORS.transport,
          };
          const fromApi = breakdown
            .map((b: unknown, i: number) => {
              const x = b as Record<string, unknown>;
              const key = String(x.category ?? x.type ?? "").toLowerCase();
              const def =
                map[key] ??
                ({
                  label: String(x.label ?? key),
                  displayLabel: String(x.label ?? key),
                  color: CHART_COLORS[i % CHART_COLORS.length],
                  emoji: "📦",
                  icon: "package",
                } as const);
              return {
                label: def.label,
                displayLabel: def.displayLabel,
                amount: parseNum(x.amount ?? x.value),
                color: def.color,
                emoji: def.emoji,
                icon: def.icon,
              } as BudgetItem;
            })
            .filter((b) => b.amount > 0);
          setBudgetBreakdown(
            fromApi.length > 0 ? fromApi : buildBudgetFromDays(days),
          );
        } else {
          setBudgetBreakdown(buildBudgetFromDays(days));
        }
        if (tripId) {
          cacheItinerary(tripId, {
            trip: tripData,
            days: rawDays,
            budgetBreakdown:
              (itineraryData as Record<string, unknown>)?.budgetBreakdown ??
              (itineraryData as Record<string, unknown>)?.budget_breakdown,
            status,
          }).catch(() => {});
        }
      }
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      if (!isOnline && tripId) {
        const cached = await getCachedItinerary(tripId);
        const data = cached?.data as
          | {
              trip?: Record<string, unknown>;
              days?: Record<string, unknown>[];
              budgetBreakdown?: unknown[];
              status?: string;
            }
          | undefined;
        if (data?.trip) {
          setTrip({
            destination: String(data.trip.destination ?? ""),
            startDate: String(
              data.trip.startDate ?? data.trip.start_date ?? "",
            ),
            endDate: String(data.trip.endDate ?? data.trip.end_date ?? ""),
            totalBudget: parseNum(
              data.trip.totalBudget ?? data.trip.total_budget,
            ),
            currency: String(data.trip.currency ?? "USD"),
            status: String(data.trip.status ?? "PENDING").toUpperCase(),
          });
          const rawDays = Array.isArray(data.days) ? data.days : [];
          if (rawDays.length > 0) {
            const days = rawDays.map((d, i) =>
              normalizeDay(d as Record<string, unknown>, i),
            );
            setItinerary(days);
            const breakdown = data.budgetBreakdown;
            if (Array.isArray(breakdown) && breakdown.length > 0) {
              const map: Record<string, (typeof BUDGET_COLORS)["flights"]> = {
                flights: BUDGET_COLORS.flights,
                accommodation: BUDGET_COLORS.accommodation,
                activities: BUDGET_COLORS.activities,
                transport: BUDGET_COLORS.transport,
              };
              setBudgetBreakdown(
                breakdown.map((b: unknown, i: number) => {
                  const x = b as Record<string, unknown>;
                  const key = String(x.category ?? x.type ?? "").toLowerCase();
                  const def =
                    map[key] ??
                    ({
                      label: String(x.label ?? key),
                      displayLabel: String(x.label ?? key),
                      color: CHART_COLORS[i % CHART_COLORS.length],
                      emoji: "📦",
                      icon: "package",
                    } as const);
                  return {
                    label: def.label,
                    displayLabel: def.displayLabel,
                    amount: parseNum(x.amount ?? x.value),
                    color: def.color,
                    emoji: def.emoji,
                    icon: def.icon,
                  } as BudgetItem;
                }),
              );
            } else setBudgetBreakdown(buildBudgetFromDays(days));
          }
          setError(null);
          setIsGenerating(false);
        } else setError("Offline. No cached itinerary.");
      } else {
        setError(getErrorMessage(err));
        setItinerary([]);
        setBudgetBreakdown([]);
        setIsGenerating(false);
      }
    } finally {
      setLoading(false);
    }
  }, [tripId, router, isOnline]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isGenerating || !tripId) return;
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [isGenerating, tripId, loadData]);

  const handleConfirm = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmError(null);
    if (!tripId) {
      router.replace("/(tabs)");
      return;
    }
    setConfirmLoading(true);
    try {
      await tripsApi.confirm(tripId);
      if (trip?.destination != null && trip?.startDate != null) {
        scheduleTripReminder({
          tripId: String(tripId),
          destination: trip.destination,
          startDate: trip.startDate,
        }).catch(() => {});
      }
      const notif: AppNotification = {
        id: `trip_confirmed_${tripId}_${Date.now()}`,
        type: "trip_confirmed",
        title: "Trip confirmed",
        body: trip?.destination
          ? `Your trip to ${trip.destination} is confirmed. Your QR Pass is ready.`
          : "Your trip is confirmed.",
        tripId: String(tripId),
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      saveNotification(notif).catch(() => {});
      showToast("success", SUCCESS_MESSAGES.TRIP_CONFIRMED);
      router.replace({ pathname: "/qr-pass", params: { tripId } });
    } catch (e: unknown) {
      setConfirmError(getErrorMessage(e));
    } finally {
      setConfirmLoading(false);
    }
  };

  const totalBudget = trip
    ? budgetBreakdown.reduce((s, b) => s + b.amount, 0) || trip.totalBudget
    : 0;
  const tripDays =
    trip && trip.startDate && trip.endDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(trip.endDate).getTime() -
              new Date(trip.startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        )
      : itinerary.length || 1;
  const offlineDisabled = !isOnline;
  const tripStatus = trip?.status?.toUpperCase() ?? "";
  const isBooked = isBookedTripStatus(tripStatus);
  const isPending = tripStatus === "PENDING";

  if (!tripId) return null;

  if (loading && !trip) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: top }]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading itinerary...</Text>
      </View>
    );
  }

  if (error && !trip) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: top }]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isGenerating) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: top }]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>
          Still generating your itinerary...
        </Text>
        <Text style={styles.generatingSubtext}>
          {"We'll refresh automatically."}
        </Text>
      </View>
    );
  }

  if (!trip) return null;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: top,
            paddingBottom: stackScrollBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <OfflineBanner visible={!isOnline} />

        <View style={styles.topBar}>
          <Text style={styles.topTitle}>
            {isBooked ? "Your Trip" : "Trip Summary"}
          </Text>
          {isPending ? (
            <TouchableOpacity
              style={styles.editTopBtn}
              onPress={() =>
                router.push({ pathname: "/edit-itinerary", params: { tripId } })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.editTopBtnText}>Edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.heroCard, CARD_SHADOW]}>
          <TripCoverImage
            destination={trip.destination}
            containerStyle={styles.heroCover}
          />
          <View style={styles.heroGradient} />
          <Text style={styles.heroDestination}>{trip.destination}</Text>
        </View>

        <View style={[styles.summaryCard, CARD_SHADOW]}>
          <View style={styles.summaryTop}>
            <Text style={styles.destination}>{trip.destination}</Text>
            <View style={styles.daysPill}>
              <Text style={styles.daysPillText}>{tripDays} Days</Text>
            </View>
          </View>
          <Text style={styles.summaryDates}>
            {formatTripDateRange(trip.startDate, trip.endDate)}
          </Text>
          <View style={styles.summaryBudgetRow}>
            <Text style={styles.summaryBudgetLabel}>Total Budget:</Text>
            <Text style={styles.summaryBudgetValue}>
              {formatMoney(totalBudget, trip.currency)}
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadData()}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {budgetBreakdown.length > 0 ? (
          <View style={[styles.budgetCard, CARD_SHADOW]}>
            <View style={styles.budgetCardHeader}>
              <View style={styles.budgetIconWrap}>
                <Feather name="pie-chart" size={10} color={GREEN} />
              </View>
              <Text style={styles.budgetCardTitle}>Budget Breakdown</Text>
            </View>
            <View style={styles.budgetChart}>
              {budgetBreakdown.map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.budgetSegment,
                    {
                      flex:
                        totalBudget > 0
                          ? item.amount / totalBudget
                          : 1 / budgetBreakdown.length,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.budgetLegendGrid}>
              {budgetBreakdown.map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: item.color }]}
                  />
                  <Text style={styles.legendText}>
                    {item.displayLabel} (
                    {formatMoney(item.amount, trip.currency)})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.daysSection}>
          {itinerary.map((day) => {
            const isExpanded = expandedDay === day.day;
            const dateLabel = trip.startDate
              ? getDayDateLabel(trip.startDate, day.day - 1)
              : "";
            const lineItems = getDayLineItems(day);

            return (
              <View key={day.day} style={[styles.dayCard, CARD_SHADOW]}>
                <TouchableOpacity
                  style={styles.dayHeader}
                  onPress={() => setExpandedDay(isExpanded ? null : day.day)}
                  activeOpacity={0.85}
                >
                  <View style={styles.dayHeaderLeft}>
                    <View style={styles.dayNumber}>
                      <Text style={styles.dayNumberText}>{day.day}</Text>
                    </View>
                    <View>
                      <Text style={styles.dayTitle}>{day.title}</Text>
                      <Text style={styles.dayMeta}>
                        {dateLabel}
                        {dateLabel ? " • " : ""}
                        {formatMoney(day.dayTotal, trip.currency)}
                      </Text>
                    </View>
                  </View>
                  <Feather
                    name="chevron-down"
                    size={14}
                    color={GREY}
                    style={{
                      transform: [{ rotate: isExpanded ? "180deg" : "0deg" }],
                    }}
                  />
                </TouchableOpacity>

                {isExpanded ? (
                  <View style={styles.dayBody}>
                    <View style={styles.dayDivider} />
                    {lineItems.map((item, idx) => (
                      <View key={`${day.day}-${idx}`} style={styles.lineItem}>
                        <View style={styles.lineIconWrap}>
                          <Feather name={item.icon} size={10} color={GREY} />
                        </View>
                        <View style={styles.lineContent}>
                          <Text style={styles.lineTag}>{item.tag}</Text>
                          <View style={styles.lineTitleRow}>
                            <Text style={styles.lineTitle} numberOfLines={2}>
                              {item.title}
                            </Text>
                            <Text style={styles.lineCost}>{item.cost}</Text>
                          </View>
                          {item.subtitle ? (
                            <Text style={styles.lineSubtitle}>
                              {item.subtitle}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {confirmError ? (
          <Text style={styles.confirmErrorText}>{confirmError}</Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.stickyCta,
          {
            bottom: insets.bottom + 16,
            left: contentPaddingHorizontal,
            right: contentPaddingHorizontal,
          },
        ]}
      >
        {isPending ? (
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (confirmLoading || offlineDisabled) && styles.btnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={confirmLoading || offlineDisabled}
            activeOpacity={0.92}
          >
            {confirmLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="maximize" size={16} color="#fff" />
                <Text style={styles.confirmText}>
                  Confirm & Generate QR Pass
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() =>
              router.replace({ pathname: "/trip-detail", params: { tripId } })
            }
            activeOpacity={0.92}
          >
            <Text style={styles.confirmText}>Open Trip Hub</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  centered: { justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { color: GREY, marginTop: 12, fontSize: 14 },
  generatingSubtext: { color: GREY, marginTop: 8, fontSize: 14 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  topTitle: { fontSize: 22, fontWeight: "700", color: TEXT, flex: 1 },
  editTopBtn: {
    minWidth: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  editTopBtnText: { fontSize: 13, fontWeight: "700", color: GREEN },
  heroCover: {
    width: "100%",
    height: "100%",
  },
  heroCard: {
    height: 160,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
    backgroundColor: "#ddd",
  },
  heroImage: { width: "100%", height: "100%" },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.35)",
  },
  heroDestination: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 16,
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 12,
  },
  destination: { fontSize: 24, fontWeight: "700", color: TEXT, flex: 1 },
  daysPill: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  daysPillText: { fontSize: 12, fontWeight: "600", color: GREEN },
  summaryDates: { fontSize: 14, color: GREY, marginBottom: 16 },
  summaryBudgetRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryBudgetLabel: { fontSize: 14, fontWeight: "600", color: TEXT },
  summaryBudgetValue: { fontSize: 14, fontWeight: "700", color: GREEN },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#EF4444", textAlign: "center", marginBottom: 8 },
  retryBtn: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: GREEN,
    borderRadius: 20,
  },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  budgetCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  budgetCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  budgetIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  budgetCardTitle: { fontSize: 14, fontWeight: "700", color: TEXT },
  budgetChart: {
    flexDirection: "row",
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  budgetSegment: { height: "100%" },
  budgetLegendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "47%",
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: GREY, flex: 1 },
  daysSection: { gap: 16, paddingBottom: 16 },
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LIGHT_GRAY,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumberText: { fontSize: 14, fontWeight: "700", color: TEXT },
  dayTitle: { fontSize: 14, fontWeight: "700", color: TEXT },
  dayMeta: { fontSize: 11, color: GREY, marginTop: 2 },
  dayBody: { paddingHorizontal: 20, paddingBottom: 20 },
  dayDivider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 16 },
  lineItem: { flexDirection: "row", gap: 12, marginBottom: 16 },
  lineIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(243, 244, 246, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  lineContent: { flex: 1, minWidth: 0 },
  lineTag: {
    fontSize: 9,
    fontWeight: "600",
    color: GREY,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  lineTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  lineTitle: { fontSize: 13, fontWeight: "600", color: TEXT, flex: 1 },
  lineCost: { fontSize: 13, fontWeight: "600", color: TEXT },
  lineSubtitle: { fontSize: 11, color: GREY, marginTop: 2 },
  confirmErrorText: { color: "#EF4444", textAlign: "center", marginBottom: 8 },
  stickyCta: {
    position: "absolute",
    zIndex: 40,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },
  secondaryCtaBtn: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  secondaryCtaText: { fontSize: 15, fontWeight: "600", color: TEXT },
});
