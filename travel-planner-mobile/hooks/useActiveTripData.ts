import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { tripsApi } from '@/api/trips';
import { itineraryApi } from '@/api/itinerary';
import { bookingsApi } from '@/api/bookings';
import { mapTripToDetailView } from '@/utils/tripDetailMappers';
import { getCurrentTripDay, toActiveServiceItem } from '@/utils/activeTrip';
import type { TripDetailView } from '@/types/trip';
import type { ActiveServiceItem } from '@/types/activeTrip';
import { ACTIVE_TRIP_REFRESH_MS } from '@/constants/activeTrip';

const STATUS_ACTIVE = 'ACTIVE';

export function useActiveTripData(tripId: string | undefined) {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetailView | null>(null);
  const [services, setServices] = useState<ActiveServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!tripId) return;
    setError(null);
    setLoading(true);
    try {
      const [tripRes, , bookingsRes] = await Promise.all([
        tripsApi.getById(tripId),
        itineraryApi.getItinerary(tripId).catch(() => ({ data: null })),
        bookingsApi.getBookingsForTrip(tripId).catch(() => ({ data: [] })),
      ]);
      const tripData = tripRes.data as Record<string, unknown>;
      if (!tripData || typeof tripData !== 'object') {
        setError('Trip not found.');
        setLoading(false);
        return;
      }
      const mappedTrip = mapTripToDetailView(tripData);
      if (mappedTrip.status !== STATUS_ACTIVE) {
        router.replace({ pathname: '/trip-detail', params: { tripId } });
        return;
      }
      setTrip(mappedTrip);
      const dayInfo = getCurrentTripDay(mappedTrip.startDate, mappedTrip.endDate);
      const currentDayIndex = dayInfo?.dayIndex ?? 0;
      const rawBookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      const items = rawBookings.map((b: Record<string, unknown>) =>
        toActiveServiceItem(b, mappedTrip.startDate, currentDayIndex)
      );
      setServices(items);
    } catch {
      setError('Failed to load. Tap Retry.');
    } finally {
      setLoading(false);
    }
  }, [tripId, router]);

  useEffect(() => {
    if (!tripId) return;
    loadData();
  }, [tripId, loadData]);

  useEffect(() => {
    if (!tripId) return;
    const id = setInterval(loadData, ACTIVE_TRIP_REFRESH_MS);
    return () => clearInterval(id);
  }, [tripId, loadData]);

  const clearError = useCallback(() => setError(null), []);
  return { trip, services, loading, error, loadData, clearError };
}
