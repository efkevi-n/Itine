import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { tripsApi } from '@/api/trips';
import { itineraryApi } from '@/api/itinerary';
import { formatTripDateRange } from '@/utils/dateFormat';
import { scheduleTripReminder } from '@/utils/notifications';
import { saveNotification } from '@/utils/notificationStore';
import type { AppNotification } from '@/types/notification';

// UI display types
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
  flights: { label: 'Flights', color: '#38bdf8', emoji: '✈️' },
  accommodation: { label: 'Accommodation', color: '#22c55e', emoji: '🏨' },
  activities: { label: 'Activities', color: '#f59e0b', emoji: '🎭' },
  transport: { label: 'Transport', color: '#a78bfa', emoji: '🚗' },
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
    [flight.airline, flight.departure, flight.arrival, flight.info]
      .filter(Boolean)
      .join(' — ');
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
    [transport.type, transport.from, transport.to, transport.info]
      .filter(Boolean)
      .join(' ');
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
    hotel: {
      name: hotelName || '—',
      type: hotelType,
      cost: hotelCost,
    },
    transport: {
      info: transportInfo || '—',
      cost: transportCost,
    },
    activities,
    dayTotal,
  };
}

function buildBudgetFromDays(days: DayItem[]): BudgetItem[] {
  let flights = 0;
  let accommodation = 0;
  let activities = 0;
  let transport = 0;
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
          const map: Record<string, { label: string; color: string; emoji: string }> = {
            flights: BUDGET_COLORS.flights,
            accommodation: BUDGET_COLORS.accommodation,
            activities: BUDGET_COLORS.activities,
            transport: BUDGET_COLORS.transport,
          };
          const fromApi = breakdown
            .map((b: unknown) => {
              const x = b as Record<string, unknown>;
              const key = String(x.category ?? x.type ?? '').toLowerCase();
              const def = map[key] ?? { label: String(x.label ?? key), color: '#94a3b8', emoji: '📦' };
              return {
                label: def.label,
                amount: parseNum(x.amount ?? x.value),
                color: def.color,
                emoji: def.emoji,
              } as BudgetItem;
            })
            .filter((b) => b.amount > 0);
          setBudgetBreakdown(fromApi.length > 0 ? fromApi : buildBudgetFromDays(days));
        } else {
          setBudgetBreakdown(buildBudgetFromDays(days));
        }
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to load itinerary.';
      setError(msg);
      setItinerary([]);
      setBudgetBreakdown([]);
      setIsGenerating(false);
    } finally {
      setLoading(false);
    }
  }, [tripId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isGenerating || !tripId) return;
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [isGenerating, tripId, loadData]);

  const handleConfirm = async () => {
    setConfirmError(null);
    if (!tripId) {
      router.replace('/(tabs)');
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
      const tripConfirmedNotification: AppNotification = {
        id: `trip_confirmed_${tripId}_${Date.now()}`,
        type: 'trip_confirmed',
        title: 'Trip confirmed',
        body: trip?.destination ? `Your trip to ${trip.destination} is confirmed. Your QR Pass is ready.` : 'Your trip is confirmed. Your QR Pass is ready.',
        tripId: String(tripId),
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      saveNotification(tripConfirmedNotification).catch(() => {});
      router.replace({ pathname: '/qr-pass', params: { tripId } });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setConfirmError(err?.response?.data?.message ?? err?.message ?? 'Failed to confirm trip.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const totalBudget = trip
    ? budgetBreakdown.reduce((s, b) => s + b.amount, 0) || trip.totalBudget
    : 0;
  const nights = trip && trip.startDate && trip.endDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;
  const statusColor = trip ? (STATUS_COLORS[trip.status] ?? '#94a3b8') : '#94a3b8';

  if (!tripId) {
    return null;
  }

  if (loading && !trip) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Loading itinerary...</Text>
      </View>
    );
  }

  if (error && !trip) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isGenerating) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Still generating...</Text>
        <Text style={styles.generatingSubtext}>{"We'll refresh automatically."}</Text>
      </View>
    );
  }

  if (!trip) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🗺️ Your Itinerary</Text>
      <Text style={styles.subtitle}>Review your AI-generated trip plan</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Trip Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Trip Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>✈️ {trip.destination}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '33' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{trip.status}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>
            📅 {formatTripDateRange(trip.startDate, trip.endDate)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>
            💰 Total: {trip.currency} {trip.totalBudget.toLocaleString()}
          </Text>
          {nights > 0 ? (
            <Text style={styles.summaryItem}>🌙 {nights} nights</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.budgetNavBtn}
          onPress={() =>
            router.push({ pathname: '/budget-breakdown', params: { tripId } })
          }
        >
          <Text style={styles.budgetNavBtnText}>💰 Budget Breakdown</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editNavBtn}
          onPress={() =>
            router.push({ pathname: '/edit-itinerary', params: { tripId } } as unknown as Parameters<typeof router.push>[0])
          }
        >
          <Text style={styles.editNavBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Budget Breakdown */}
      <View style={styles.budgetCard}>
        <Text style={styles.sectionTitle}>💰 Budget by category</Text>
        <View style={styles.budgetBar}>
          {budgetBreakdown.map((item) => (
            <View
              key={item.label}
              style={[
                styles.budgetSegment,
                {
                  flex: totalBudget > 0 ? item.amount / totalBudget : 0.25,
                  backgroundColor: item.color,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.budgetLegend}>
          {budgetBreakdown.map((item) => {
            const pct = totalBudget > 0 ? Math.round((item.amount / totalBudget) * 100) : 0;
            return (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.emoji} {item.label}</Text>
                <Text style={styles.legendAmount}>
                  {trip.currency} {item.amount} ({pct}%)
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Day by Day */}
      <Text style={styles.sectionTitle}>📅 Day-by-Day Plan</Text>
      {itinerary.map((day) => (
        <View key={day.day} style={styles.dayCard}>
          <TouchableOpacity
            style={styles.dayHeader}
            onPress={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
          >
            <Text style={styles.dayTitle}>Day {day.day} — {day.title}</Text>
            <Text style={styles.dayTotal}>
              {trip.currency} {day.dayTotal}
            </Text>
            <Text style={styles.expandIcon}>{expandedDay === day.day ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {expandedDay === day.day && (
            <View style={styles.dayContent}>
              {day.flight && (
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel}>✈️ Flight</Text>
                    <Text style={styles.itemValue}>{day.flight.info}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemCost}>{day.flight.cost}</Text>
                  </View>
                </View>
              )}

              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemLabel}>🏨 Hotel / Accommodation</Text>
                  <Text style={styles.itemValue}>{day.hotel.name}</Text>
                  <Text style={styles.itemSubValue}>{day.hotel.type}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemCost}>{day.hotel.cost}</Text>
                </View>
              </View>

              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemLabel}>🚗 Transport</Text>
                  <Text style={styles.itemValue}>{day.transport.info}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemCost}>{day.transport.cost}</Text>
                </View>
              </View>

              <Text style={styles.activitiesLabel}>🎭 Activities</Text>
              {day.activities.map((activity, index) => (
                <View key={index} style={styles.activityRow}>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>{activity.name}</Text>
                    {activity.duration ? (
                      <Text style={styles.activityDuration}>{activity.duration}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.activityCost}>{activity.cost}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {confirmError ? (
        <Text style={styles.confirmErrorText}>{confirmError}</Text>
      ) : null}

      <TouchableOpacity
        style={styles.confirmBtn}
        onPress={handleConfirm}
        disabled={confirmLoading}
      >
        {confirmLoading ? (
          <>
            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.confirmText}>Confirming...</Text>
          </>
        ) : (
          <Text style={styles.confirmText}>✅ Confirm & Generate QR Pass</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.rejectBtn} onPress={() => router.back()}>
        <Text style={styles.rejectText}>🔄 Regenerate</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12 },
  generatingSubtext: { color: '#64748b', marginTop: 8, fontSize: 14 },
  navRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  budgetNavBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  budgetNavBtnText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 16 },
  editNavBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  editNavBtnText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 16 },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#38bdf8',
    borderRadius: 12,
  },
  retryBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  backButton: { marginTop: 60, marginBottom: 16 },
  backText: { color: '#38bdf8', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#fca5a5', textAlign: 'center' },
  summaryCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#38bdf8', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  summaryItem: { fontSize: 14, color: '#fff' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  budgetCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  budgetBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
  budgetSegment: { height: '100%', minWidth: 4 },
  budgetLegend: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#fff', fontSize: 13, flex: 1 },
  legendAmount: { color: '#94a3b8', fontSize: 13 },
  dayCard: { backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, flexWrap: 'wrap' },
  dayTitle: { fontSize: 15, fontWeight: 'bold', color: '#38bdf8', flex: 1 },
  dayTotal: { fontSize: 13, color: '#22c55e', fontWeight: 'bold', marginRight: 8 },
  expandIcon: { color: '#94a3b8', fontSize: 12 },
  dayContent: { paddingHorizontal: 16, paddingBottom: 16 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  itemValue: { fontSize: 14, color: '#fff' },
  itemSubValue: { fontSize: 12, color: '#94a3b8' },
  itemRight: { alignItems: 'flex-end' },
  itemCost: { fontSize: 14, color: '#22c55e', fontWeight: 'bold' },
  activitiesLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 13, color: '#fff' },
  activityDuration: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  activityCost: { fontSize: 13, color: '#f59e0b' },
  confirmErrorText: { color: '#fca5a5', textAlign: 'center', marginBottom: 8 },
  confirmBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  rejectBtn: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center' },
  rejectText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 16 },
});
