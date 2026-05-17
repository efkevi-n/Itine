import { useState, useCallback, useEffect } from 'react';
import { tripsApi } from '@/api/trips';
import { itineraryApi, type ItineraryDayRaw } from '@/api/itinerary';
import { bookingsApi } from '@/api/bookings';
import { mapTripToDetailView, mapBookingToDetailView } from '@/utils/tripDetailMappers';
import { mapCostBreakdownToView } from '@/utils/budgetBreakdown';
import { buildLiveTripPlan } from '@/utils/liveTripBuilder';
import { getCurrentTripDay, getNextUpcomingService, toActiveServiceItem } from '@/utils/activeTrip';
import type { ActiveServiceItem } from '@/types/activeTrip';
import type { LiveTripTrackerState } from '@/types/liveTrip';
import { ACTIVE_TRIP_REFRESH_MS } from '@/constants/activeTrip';
import { cacheTrip, getCachedTrip } from '@/utils/offlineCache';
import { useConnectivity } from '@/hooks/useConnectivity';

type RawRecord = Record<string, unknown>;

function getItineraryDays(payload: unknown): ItineraryDayRaw[] {
  if (!payload || typeof payload !== 'object') return [];
  const days = (payload as Record<string, unknown>).days;
  return Array.isArray(days) ? (days as ItineraryDayRaw[]) : [];
}

export function useLiveTripTracker(tripId: string | undefined) {
  const { isOnline } = useConnectivity();
  const [tracker, setTracker] = useState<LiveTripTrackerState | null>(null);
  const [services, setServices] = useState<ActiveServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!tripId) return;
    setError(null);
    setLoading(true);
    try {
      const [tripRes, itineraryRes, bookingsRes, breakdownRes] = await Promise.all([
        tripsApi.getById(tripId),
        itineraryApi.getItinerary(tripId).catch(() => ({ data: null })),
        bookingsApi.getBookingsForTrip(tripId).catch(() => ({ data: [] })),
        itineraryApi.getCostBreakdown(tripId).catch(() => ({ data: null })),
      ]);

      const tripData = tripRes.data as Record<string, unknown>;
      if (!tripData || typeof tripData !== 'object') {
        setError('Trip not found.');
        setLoading(false);
        return;
      }

      const trip = mapTripToDetailView(tripData);
      const itineraryDays = getItineraryDays(itineraryRes.data);
      const rawBookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      const bookings = rawBookings.map((b) => mapBookingToDetailView(b as Record<string, unknown>));

      const breakdownRaw = breakdownRes.data as Record<string, unknown> | null;
      const breakdownList = Array.isArray(breakdownRaw?.breakdown)
        ? (breakdownRaw.breakdown as Parameters<typeof mapCostBreakdownToView>[0])
        : undefined;
      const budgetView = mapCostBreakdownToView(breakdownList, trip.totalBudget, trip.currency);

      const plan = buildLiveTripPlan(trip, itineraryDays, bookings, rawBookings as RawRecord[], budgetView);
      setTracker(plan);

      const dayInfo = getCurrentTripDay(trip.startDate, trip.endDate);
      const currentDayIndex = dayInfo?.dayIndex ?? 0;
      setServices(
        rawBookings.map((b) =>
          toActiveServiceItem(b as RawRecord, trip.startDate, currentDayIndex),
        ),
      );

      await cacheTrip(tripId, { trip: tripData, bookings: rawBookings });
    } catch {
      if (!isOnline) {
        const cached = await getCachedTrip(tripId);
        const data = cached?.data as { trip?: Record<string, unknown>; bookings?: unknown[] } | undefined;
        if (data?.trip) {
          const trip = mapTripToDetailView(data.trip);
          const rawBookings = Array.isArray(data.bookings) ? data.bookings : [];
          const bookings = rawBookings.map((b) => mapBookingToDetailView(b as Record<string, unknown>));
          const budgetView = mapCostBreakdownToView(undefined, trip.totalBudget, trip.currency);
          const plan = buildLiveTripPlan(trip, [], bookings, rawBookings as RawRecord[], budgetView);
          setTracker(plan);
          setError(null);
        } else {
          setError('Offline. No cached trip data.');
        }
      } else {
        setError('Failed to load live trip. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [tripId, isOnline]);

  useEffect(() => {
    if (!tripId) return;
    loadData();
  }, [tripId, loadData]);

  useEffect(() => {
    if (!tripId) return;
    const id = setInterval(loadData, ACTIVE_TRIP_REFRESH_MS);
    return () => clearInterval(id);
  }, [tripId, loadData]);

  const dayInfo = tracker ? getCurrentTripDay(tracker.trip.startDate, tracker.trip.endDate) : null;
  const currentDayIndex = dayInfo?.dayIndex ?? 0;
  const nextService = getNextUpcomingService(services, currentDayIndex);

  return {
    tracker,
    services,
    dayInfo,
    nextService,
    loading,
    error,
    loadData,
    clearError: () => setError(null),
  };
}
