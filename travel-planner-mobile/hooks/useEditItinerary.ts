import { useState, useCallback, useEffect, useMemo } from 'react';
import { itineraryApi } from '@/api/itinerary';
import { tripsApi } from '@/api/trips';
import { searchFlights, searchAccommodation, searchTransport } from '@/api/adapters';
import {
  itineraryToEditableServices,
  calculateTotalCost,
  exceedsBudget,
  parseAdapterResultsToSwapOptions,
  getTripBudget,
  regenerateItinerary,
} from '@/utils/editItinerary';
import { canEditTrip } from '@/utils/tripStatus';
import type { EditableService, SwapOption } from '@/types/editItinerary';
import type { ItineraryDayRaw } from '@/api/itinerary';

export function useEditItinerary(tripId: string | undefined) {
  const [originalDays, setOriginalDays] = useState<ItineraryDayRaw[]>([]);
  const [currentDays, setCurrentDays] = useState<ItineraryDayRaw[]>([]);
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [alternatives, setAlternatives] = useState<Record<string, SwapOption[]>>({});
  const [loadingAltFor, setLoadingAltFor] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const services = useMemo(() => itineraryToEditableServices(currentDays), [currentDays]);
  const totalCost = useMemo(() => calculateTotalCost(services), [services]);
  const totalBudget = getTripBudget(trip ?? {});
  const currency = String(trip?.currency ?? 'USD');
  const overBudget = exceedsBudget(totalCost, totalBudget);

  const loadData = useCallback(async () => {
    if (!tripId) return;
    setError(null);
    setLoading(true);
    try {
      const [itRes, tripRes] = await Promise.all([
        itineraryApi.getItinerary(tripId),
        tripsApi.getById(tripId),
      ]);
      const tripData = (tripRes.data ?? {}) as Record<string, unknown>;
      const tripStatus = String(tripData.status ?? 'PENDING').toUpperCase();

      if (!canEditTrip(tripStatus)) {
        setLocked(true);
        setError('This trip has been booked and can no longer be edited.');
        setOriginalDays([]);
        setCurrentDays([]);
        setTrip(tripData);
        return;
      }

      setLocked(false);
      const itData = (itRes.data as { days?: ItineraryDayRaw[] })?.days ?? [];
      setOriginalDays(JSON.parse(JSON.stringify(itData)));
      setCurrentDays(JSON.parse(JSON.stringify(itData)));
      setTrip(tripData);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fetchAlternatives = useCallback(
    async (service: EditableService) => {
      const dest = String(trip?.destination ?? '');
      setLoadingAltFor(service.id);
      try {
        let raw: unknown[] = [];
        if (service.type === 'flight') {
          const res = await searchFlights({ destination: dest, origin: dest });
          raw = Array.isArray(res.data) ? res.data : [];
        } else if (service.type === 'hotel') {
          const res = await searchAccommodation({ city: dest });
          raw = Array.isArray(res.data) ? res.data : [];
        } else if (service.type === 'transport') {
          const res = await searchTransport({ city: dest });
          raw = Array.isArray(res.data) ? res.data : [];
        }
        const opts = parseAdapterResultsToSwapOptions(raw, service.cost);
        setAlternatives((prev) => ({ ...prev, [service.id]: opts }));
      } catch {
        setAlternatives((prev) => ({ ...prev, [service.id]: [] }));
      } finally {
        setLoadingAltFor(null);
      }
    },
    [trip],
  );

  const handleSelectAlternative = useCallback(
    (serviceId: string, option: SwapOption) => {
      const parts = serviceId.split('-');
      if (parts[0] !== 'day') return;
      const dayIndex = parseInt(parts[1], 10);
      if (Number.isNaN(dayIndex) || dayIndex < 0 || dayIndex >= currentDays.length) return;
      const next = JSON.parse(JSON.stringify(currentDays)) as ItineraryDayRaw[];
      const day = next[dayIndex] as Record<string, unknown>;
      const type = parts[2];
      if (type === 'flight') day.flight = option.raw;
      else if (type === 'hotel') {
        day.hotel = option.raw;
        day.accommodation = option.raw;
      } else if (type === 'transport') day.transport = option.raw;
      else if (type === 'activity') {
        const actIndex = parseInt(parts[3], 10);
        const acts = (day.activities as unknown[]) ?? [];
        if (!Number.isNaN(actIndex) && actIndex >= 0 && actIndex < acts.length) {
          acts[actIndex] = option.raw;
          day.activities = acts;
        }
      }
      setCurrentDays(next);
    },
    [currentDays],
  );

  const handleSave = useCallback(
    async (onSuccess: () => void) => {
      if (!tripId || saving || locked) return;
      setSaving(true);
      setError(null);
      try {
        await itineraryApi.updateItinerary(tripId, { days: currentDays } as { days: ItineraryDayRaw[] });
        onSuccess();
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        setError(err?.response?.data?.message ?? err?.message ?? 'Save failed.');
      } finally {
        setSaving(false);
      }
    },
    [tripId, currentDays, saving, locked],
  );

  const handleReset = useCallback(() => {
    setCurrentDays(JSON.parse(JSON.stringify(originalDays)));
  }, [originalDays]);

  const handleRegenerate = useCallback(async () => {
    if (!tripId || regenerating || locked) return;
    setRegenerating(true);
    setError(null);
    const result = await regenerateItinerary(tripId, itineraryApi);
    if (result.success) await loadData();
    else if (result.error) setError(result.error);
    setRegenerating(false);
  }, [tripId, regenerating, locked, loadData]);

  return {
    services,
    totalCost,
    totalBudget,
    currency,
    overBudget,
    locked,
    loading,
    error,
    saving,
    regenerating,
    alternatives,
    loadingAltFor,
    currentDays,
    loadData,
    fetchAlternatives,
    handleSelectAlternative,
    handleSave,
    handleReset,
    handleRegenerate,
  };
}
