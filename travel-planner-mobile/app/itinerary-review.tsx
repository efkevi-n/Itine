import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { tripsApi } from '@/api/trips';
import { itineraryApi } from '@/api/itinerary';
import { formatTripDateRange } from '@/utils/dateFormat';
import { scheduleTripReminder } from '@/utils/notifications';
import { saveNotification } from '@/utils/notificationStore';
import type { AppNotification } from '@/types/notification';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useConnectivity } from '@/hooks/useConnectivity';
import { cacheItinerary, getCachedItinerary } from '@/utils/offlineCache';
import { showToast } from '@/utils/toastStore';
import { getErrorMessage } from '@/utils/errorHandler';
import { SUCCESS_MESSAGES } from '@/constants/errors';

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
}

interface TripSummary {
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency: string;
  status: string;
}

const BUDGET_COLORS = {
  flights: { label: 'Flights', color: '#38bdf8', emoji: '✈️', icon: 'navigation' },
  accommodation: { label: 'Accommodation', color: '#22c55e', emoji: '🏨', icon: 'home' },
  activities: { label: 'Activities', color: '#f59e0b', emoji: '🎭', icon: 'film' },
  transport: { label: 'Transport', color: '#a78bfa', emoji: '🚗', icon: 'truck' },
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#94a3b8',
  CONFIRMED: '#38bdf8',
  ACTIVE: '#22c55e',
  COMPLETED: '#64748b',
  CANCELLED: '#ef4444',
};

function parseNum(v: unknown): number {
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

function normalizeDay(raw: Record<string, unknown>, index: number): DayItem {
  const dayNum = index + 1;
  const flight = raw.flight as Record<string, unknown> | null | undefined;
  const hotel = (raw.hotel ?? raw.accommodation) as Record<string, unknown> | undefined;
  const transport = raw.transport as Record<string, unknown> | undefined;
  const activitiesRaw = (raw.activities ?? []) as unknown[];

  const flightInfo =
    flight &&
    [flight.airline, flight.departure, flight.arrival, flight.info].filter(Boolean).join(' — ');
  const flightCost =
    flight && (flight.price != null || flight.cost != null)
      ? `$${parseNum(flight.price ?? flight.cost)}`
      : '$0';

  const hotelName = String(hotel?.['name'] ?? hotel?.['hotelName'] ?? '');
  const hotelType = String(hotel?.['type'] ?? '');
  const hotelCostVal = hotel?.['cost'] ?? hotel?.['pricePerNight'];
  const hotelCost = hotelCostVal != null
    ? `${typeof hotelCostVal === 'string' ? hotelCostVal : `$${parseNum(hotelCostVal)}/night`}`
    : '—';

  const transportInfo =
    transport &&
    [transport.type, transport.from, transport.to, transport.info].filter(Boolean).join(' ');
  const transportCost =
    transport && (transport.price != null || transport.cost != null)
      ? `$${parseNum(transport.price ?? transport.cost)}`
      : '$0';

  const activities: ActivityItem[] = activitiesRaw.map((a: unknown) => {
    const x = a as Record<string, unknown>;
    return {
      name: String(x.name ?? ''),
      cost: x.cost != null ? `$${parseNum(x.cost)}` : '—',
      duration: x.duration != null ? String(x.duration) : undefined,
    };
  });

  let dayTotal = parseNum(flight?.price ?? flight?.cost) + parseNum(transport?.price ?? transport?.cost);
  activities.forEach((a) => {
    const m = String(a.cost).replace(/[^0-9.]/g, '');
    if (m) dayTotal += parseFloat(m) || 0;
  });
  const hotelPrice = hotel?.['pricePerNight'] ?? hotel?.['cost'];
  if (hotelPrice != null) dayTotal += parseNum(hotelPrice);

  return {
    day: dayNum,
    title: String(raw.title ?? `Day ${dayNum}`),
    flight:
      flight && (flightInfo || parseNum(flight.price ?? flight.cost) > 0)
        ? { info: flightInfo || 'Flight', cost: flightCost }
        : null,
    hotel: { name: hotelName || '—', type: hotelType, cost: hotelCost },
    transport: { info: transportInfo || '—', cost: transportCost },
    activities,
    dayTotal,
  };
}

function buildBudgetFromDays(days: DayItem[]): BudgetItem[] {
  let flights = 0, accommodation = 0, activities = 0, transport = 0;
  days.forEach((d) => {
    if (d.flight) {
      const m = d.flight.cost.replace(/[^0-9.]/g, '');
      if (m) flights += parseFloat(m);
    }
    const hotelMatch = d.hotel.cost.match(/[\d.]+/);
    if (hotelMatch) accommodation += parseFloat(hotelMatch[0]);
    d.activities.forEach((a) => {
      const m = a.cost.replace(/[^0-9.]/g, '');
      if (m) activities += parseFloat(m);
    });
    const transMatch = d.transport.cost.replace(/[^0-9.]/g, '');
    if (transMatch) transport += parseFloat(transMatch);
  });
  return [
    { ...BUDGET_COLORS.flights, amount: Math.round(flights) },
    { ...BUDGET_COLORS.accommodation, amount: Math.round(accommodation) },
    { ...BUDGET_COLORS.activities, amount: Math.round(activities) },
    { ...BUDGET_COLORS.transport, amount: Math.round(transport) },
  ].filter((b) => b.amount > 0);
}

export default function ItineraryReviewScreen() {
  const router = useRouter();
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
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const loadData = useCallback(async () => {
    if (!tripId) {
      router.replace('/(tabs)');
      return;
    }
    setError(null);
    setLoading(true);
    setIsGenerating(false);
    try {
      const tripRes = await tripsApi.getById(tripId);
      const tripData = tripRes.data ?? (tripRes as { data?: Record<string, unknown> }).data;
      if (!tripData || typeof tripData !== 'object') {
        setError('Failed to load trip.');
        setLoading(false);
        return;
      }
      setTrip({
        destination: String(tripData.destination ?? ''),
        startDate: String(tripData.startDate ?? tripData.start_date ?? ''),
        endDate: String(tripData.endDate ?? tripData.end_date ?? ''),
        totalBudget: parseNum(tripData.totalBudget ?? tripData.total_budget),
        currency: String(tripData.currency ?? 'USD'),
        status: String(tripData.status ?? 'PENDING').toUpperCase(),
      });

      const itineraryRes = await itineraryApi.getItinerary(tripId);
      const itineraryData = itineraryRes.data ?? (itineraryRes as { data?: unknown }).data;
      const rawDays = Array.isArray((itineraryData as Record<string, unknown>)?.days)
        ? (itineraryData as { days: Record<string, unknown>[] }).days
        : Array.isArray(itineraryData)
          ? itineraryData
          : [];
      const status = (itineraryData as Record<string, unknown>)?.status as string | undefined;
      const generating = String(status ?? '').toLowerCase() === 'generating' || rawDays.length === 0;

      if (generating) {
        setIsGenerating(true);
        setItinerary([]);
        setBudgetBreakdown([]);
      } else {
        setIsGenerating(false);
        const days = rawDays.map((d, i) => normalizeDay(d as Record<string, unknown>, i));
        setItinerary(days);
        const breakdown =
          (itineraryData as Record<string, unknown>)?.budgetBreakdown ??
          (itineraryData as Record<string, unknown>)?.budget_breakdown;
        if (Array.isArray(breakdown) && breakdown.length > 0) {
          const map: Record<string, { label: string; color: string; emoji: string; icon: string }> = {
            flights: BUDGET_COLORS.flights,
            accommodation: BUDGET_COLORS.accommodation,
            activities: BUDGET_COLORS.activities,
            transport: BUDGET_COLORS.transport,
          };
          const fromApi = breakdown
            .map((b: unknown) => {
              const x = b as Record<string, unknown>;
              const key = String(x.category ?? x.type ?? '').toLowerCase();
              const def = map[key] ?? { label: String(x.label ?? key), color: '#94a3b8', emoji: '📦', icon: 'package' };
              return { label: def.label, amount: parseNum(x.amount ?? x.value), color: def.color, emoji: def.emoji, icon: def.icon } as BudgetItem;
            })
            .filter((b) => b.amount > 0);
          setBudgetBreakdown(fromApi.length > 0 ? fromApi : buildBudgetFromDays(days));
        } else {
          setBudgetBreakdown(buildBudgetFromDays(days));
        }
        if (tripId) {
          cacheItinerary(tripId, {
            trip: tripData,
            days: rawDays,
            budgetBreakdown: (itineraryData as Record<string, unknown>)?.budgetBreakdown ?? (itineraryData as Record<string, unknown>)?.budget_breakdown,
            status,
          }).catch(() => {});
        }
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      if (!isOnline && tripId) {
        const cached = await getCachedItinerary(tripId);
        const data = cached?.data as { trip?: Record<string, unknown>; days?: Record<string, unknown>[]; budgetBreakdown?: unknown[]; status?: string } | undefined;
        if (data?.trip) {
          setTrip({
            destination: String(data.trip.destination ?? ''),
            startDate: String(data.trip.startDate ?? data.trip.start_date ?? ''),
            endDate: String(data.trip.endDate ?? data.trip.end_date ?? ''),
            totalBudget: parseNum(data.trip.totalBudget ?? data.trip.total_budget),
            currency: String(data.trip.currency ?? 'USD'),
            status: String(data.trip.status ?? 'PENDING').toUpperCase(),
          });
          const rawDays = Array.isArray(data.days) ? data.days : [];
          if (rawDays.length > 0) {
            const days = rawDays.map((d, i) => normalizeDay(d as Record<string, unknown>, i));
            setItinerary(days);
            const breakdown = data.budgetBreakdown;
            if (Array.isArray(breakdown) && breakdown.length > 0) {
              const map: Record<string, { label: string; color: string; emoji: string; icon: string }> = {
                flights: BUDGET_COLORS.flights,
                accommodation: BUDGET_COLORS.accommodation,
                activities: BUDGET_COLORS.activities,
                transport: BUDGET_COLORS.transport,
              };
              setBudgetBreakdown(breakdown.map((b: unknown) => {
                const x = b as Record<string, unknown>;
                const key = String(x.category ?? x.type ?? '').toLowerCase();
                const def = map[key] ?? { label: String(x.label ?? key), color: '#94a3b8', emoji: '📦', icon: 'package' };
                return { label: def.label, amount: parseNum(x.amount ?? x.value), color: def.color, emoji: def.emoji, icon: def.icon } as BudgetItem;
              }));
            } else setBudgetBreakdown(buildBudgetFromDays(days));
          }
          setError(null);
          setIsGenerating(false);
        } else setError('Offline. No cached itinerary.');
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
    if (!tripId) { router.replace('/(tabs)'); return; }
    setConfirmLoading(true);
    try {
      await tripsApi.confirm(tripId);
      if (trip?.destination != null && trip?.startDate != null) {
        scheduleTripReminder({ tripId: String(tripId), destination: trip.destination, startDate: trip.startDate }).catch(() => {});
      }
      const notif: AppNotification = {
        id: `trip_confirmed_${tripId}_${Date.now()}`,
        type: 'trip_confirmed',
        title: 'Trip confirmed',
        body: trip?.destination ? `Your trip to ${trip.destination} is confirmed. Your QR Pass is ready.` : 'Your trip is confirmed.',
        tripId: String(tripId),
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      saveNotification(notif).catch(() => {});
      showToast('success', SUCCESS_MESSAGES.TRIP_CONFIRMED);
      router.replace({ pathname: '/qr-pass', params: { tripId } });
    } catch (e: unknown) {
      setConfirmError(getErrorMessage(e));
    } finally {
      setConfirmLoading(false);
    }
  };

  const totalBudget = trip
    ? budgetBreakdown.reduce((s, b) => s + b.amount, 0) || trip.totalBudget
    : 0;
  const nights = trip && trip.startDate && trip.endDate
    ? Math.max(0, Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const statusColor = trip ? (STATUS_COLORS[trip.status] ?? '#94a3b8') : '#94a3b8';
  const offlineDisabled = !isOnline;

  if (!tripId) return null;

  if (loading && !trip) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading itinerary...</Text>
      </View>
    );
  }

  if (error && !trip) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isGenerating) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Still generating your itinerary...</Text>
        <Text style={styles.generatingSubtext}>{"We'll refresh automatically."}</Text>
      </View>
    );
  }

  if (!trip) return null;

  return (
    <View style={styles.screen}>
      <View style={[styles.glowOrb, styles.glowOrbTop]} pointerEvents="none" />
      <View style={[styles.glowOrb, styles.glowOrbBottom]} pointerEvents="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <OfflineBanner visible={!isOnline} />

          <TouchableOpacity onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }} style={styles.backButton} activeOpacity={0.7}>
            <Feather name="chevron-left" size={22} color="#6366f1" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <Text style={styles.headerKicker}>ITINERARY REVIEW</Text>
            <Text style={styles.headerTitle}>Your Trip Plan</Text>
            <Text style={styles.headerSubtitle}>Review and confirm your AI-generated itinerary</Text>
            <View style={styles.headerDivider} />
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.cardKicker}>TRIP SUMMARY</Text>
            <Text style={styles.destinationText}>{trip.destination}</Text>
            <View style={styles.pillRow}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{formatTripDateRange(trip.startDate, trip.endDate)}</Text>
              </View>
              {nights > 0 ? (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{nights} nights</Text>
                </View>
              ) : null}
              <View style={[styles.pill, styles.pillAccent]}>
                <Text style={styles.pillAccentText}>
                  {trip.currency} {totalBudget.toLocaleString()}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: `${statusColor}22`, borderColor: `${statusColor}44` }]}>
                <Text style={[styles.pillText, { color: statusColor }]}>{trip.status}</Text>
              </View>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.navRow}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => router.push({ pathname: '/budget-breakdown', params: { tripId } })}
            >
              <Feather name="pie-chart" size={16} color="#6366f1" />
              <Text style={styles.navBtnText}>Budget</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navBtn, offlineDisabled && styles.btnDisabled]}
              onPress={() => !offlineDisabled && router.push({ pathname: '/edit-itinerary', params: { tripId } } as Parameters<typeof router.push>[0])}
              disabled={offlineDisabled}
            >
              <Feather name="edit-2" size={16} color="#6366f1" />
              <Text style={styles.navBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {budgetBreakdown.length > 0 ? (
            <View style={styles.budgetCard}>
              <Text style={styles.cardKicker}>BUDGET BREAKDOWN</Text>
              <View style={styles.budgetBar}>
                {budgetBreakdown.map((item) => (
                  <View
                    key={item.label}
                    style={[styles.budgetSegment, { flex: totalBudget > 0 ? item.amount / totalBudget : 0.25, backgroundColor: item.color }]}
                  />
                ))}
              </View>
              <View style={styles.budgetLegend}>
                {budgetBreakdown.map((item) => (
                  <View key={item.label} style={styles.legendRow}>
                    <View style={styles.legendLeft}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Feather name={item.icon as keyof typeof Feather.glyphMap} size={14} color="#9ca3af" style={styles.legendIcon} />
                      <Text style={styles.legendLabel}>{item.label}</Text>
                    </View>
                    <Text style={styles.legendAmount}>{trip.currency} {item.amount}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.budgetTotalRow}>
                <Text style={styles.budgetTotalLabel}>TOTAL</Text>
                <Text style={styles.budgetTotalValue}>{trip.currency} {totalBudget.toLocaleString()}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.dayByDaySection}>
            <Text style={styles.sectionKicker}>DAY-BY-DAY PLAN</Text>
            {itinerary.map((day) => (
              <View key={day.day} style={styles.dayCard}>
                <TouchableOpacity
                  style={styles.dayHeader}
                  onPress={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={styles.dayKicker}>DAY {day.day}</Text>
                    <Text style={styles.dayTitle}>{day.title}</Text>
                  </View>
                  <Feather
                    name={expandedDay === day.day ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color="#6366f1"
                  />
                </TouchableOpacity>

                {expandedDay === day.day && (
                  <View style={styles.dayExpanded}>
                    <View style={styles.expandedDivider} />

                    {day.flight && (
                      <View style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemTypeLabel}>FLIGHT</Text>
                          <Text style={styles.itemValue}>{day.flight.info}</Text>
                        </View>
                        <View style={styles.itemRight}>
                          <Text style={styles.itemCost}>{day.flight.cost}</Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTypeLabel}>HOTEL</Text>
                        <Text style={styles.itemValue}>{day.hotel.name}</Text>
                        <Text style={styles.itemSubValue}>{day.hotel.type}</Text>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={styles.itemCost}>{day.hotel.cost}</Text>
                      </View>
                    </View>

                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTypeLabel}>TRANSPORT</Text>
                        <Text style={styles.itemValue}>{day.transport.info}</Text>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={styles.itemCost}>{day.transport.cost}</Text>
                      </View>
                    </View>

                    <Text style={styles.activitiesLabel}>ACTIVITIES</Text>
                    {day.activities.map((activity, index) => (
                      <View
                        key={index}
                        style={[styles.activityRow, index < day.activities.length - 1 && styles.activityRowSep]}
                      >
                        <Text style={styles.activityName}>{activity.name}</Text>
                        <Text style={styles.activityCost}>{activity.cost}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          {confirmError ? (
            <Text style={styles.confirmErrorText}>{confirmError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.confirmBtn, (confirmLoading || offlineDisabled) && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={confirmLoading || offlineDisabled}
            activeOpacity={0.85}
          >
            {confirmLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>Confirm & Generate QR Pass</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.regenerateBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.regenerateText}>Regenerate</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0d14' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  glowOrb: { position: 'absolute', width: 320, height: 320, borderRadius: 999, backgroundColor: 'rgba(99,102,241,0.08)' },
  glowOrbTop: { top: -80, right: -100 },
  glowOrbBottom: { bottom: -120, left: -80 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 60, gap: 20 },
  loadingText: { color: '#9ca3af', marginTop: 12 },
  generatingSubtext: { color: '#4b5563', marginTop: 8, fontSize: 14 },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 12, padding: 12 },
  errorText: { color: '#f87171', textAlign: 'center', marginBottom: 8 },
  retryBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#6366f1', borderRadius: 12, alignSelf: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 48, paddingVertical: 4 },
  backText: { color: '#6366f1', fontSize: 16, fontWeight: '500' },
  headerSection: { gap: 6 },
  headerKicker: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#ffffff' },
  headerSubtitle: { fontSize: 13, color: '#9ca3af', lineHeight: 20 },
  headerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 10 },
  summaryCard: { backgroundColor: '#13131f', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 16, gap: 12 },
  cardKicker: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
  destinationText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 13, color: '#9ca3af' },
  pillAccent: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.25)' },
  pillAccentText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
  navRow: { flexDirection: 'row', gap: 12 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, backgroundColor: '#13131f', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  navBtnText: { color: '#6366f1', fontWeight: '600', fontSize: 15 },
  budgetCard: { backgroundColor: '#13131f', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 16, gap: 14 },
  budgetBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  budgetSegment: { height: '100%' },
  budgetLegend: { gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendIcon: { marginRight: 2 },
  legendLabel: { fontSize: 13, color: '#9ca3af', flex: 1 },
  legendAmount: { fontSize: 13, color: '#ffffff', fontWeight: '700' },
  budgetTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.06)' },
  budgetTotalLabel: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
  budgetTotalValue: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  dayByDaySection: { gap: 12 },
  sectionKicker: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
  dayCard: { backgroundColor: '#13131f', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  dayKicker: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
  dayTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginTop: 4 },
  dayExpanded: { paddingHorizontal: 16, paddingBottom: 16 },
  expandedDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 14 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, marginBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
  itemInfo: { flex: 1, paddingRight: 12 },
  itemTypeLabel: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  itemValue: { fontSize: 14, color: '#ffffff' },
  itemSubValue: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  itemRight: { alignItems: 'flex-end', gap: 8 },
  itemCost: { fontSize: 14, color: '#ffffff', fontWeight: '700' },
  activitiesLabel: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 10, marginTop: 4 },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10 },
  activityRowSep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
  activityName: { fontSize: 14, color: '#9ca3af', flex: 1, paddingRight: 12 },
  activityCost: { fontSize: 14, color: '#f59e0b', fontWeight: '600' },
  confirmErrorText: { color: '#f87171', textAlign: 'center' },
  confirmBtn: { width: '100%', height: 54, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  regenerateBtn: { width: '100%', height: 54, borderRadius: 12, backgroundColor: '#13131f', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  regenerateText: { color: '#9ca3af', fontSize: 16, fontWeight: '500' },
  btnDisabled: { opacity: 0.6 },
});
