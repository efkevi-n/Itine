import type { EditableService, SwapOption } from '@/types/editItinerary';
import type { ItineraryDayRaw } from '@/api/itinerary';
import { POLL_INTERVAL_MS, POLL_MAX_ATTEMPTS } from '@/constants/editItinerary';

type ItineraryApi = {
  generate: (data: { tripId?: string | number }) => Promise<{ data?: { jobId?: string; id?: string } }>;
  getJobStatus: (jobId: string) => Promise<{ data?: { status?: string } }>;
};

/** Regenerate itinerary, poll until complete or failed. Returns true if complete. */
export async function regenerateItinerary(
  tripId: string,
  api: ItineraryApi
): Promise<{ success: boolean; error?: string }> {
  try {
    const genRes = await api.generate({ tripId });
    const jobId = String(genRes.data?.jobId ?? genRes.data?.id ?? '');
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const jobRes = await api.getJobStatus(jobId);
      const status = String(jobRes.data?.status ?? '').toLowerCase();
      if (status === 'complete' || status === 'completed') return { success: true };
      if (status === 'failed' || status === 'error') return { success: false, error: 'Regeneration failed.' };
    }
    return { success: false, error: 'Regeneration is taking too long.' };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { success: false, error: err?.message ?? 'Regeneration failed.' };
  }
}

function parseCost(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

/** Build flat list of editable services from itinerary days. */
export function itineraryToEditableServices(
  days: ItineraryDayRaw[] | undefined
): EditableService[] {
  const out: EditableService[] = [];
  if (!Array.isArray(days)) return out;
  days.forEach((day, dayIndex) => {
    const prefix = `day-${dayIndex}`;
    const flight = day.flight as Record<string, unknown> | undefined;
    if (flight != null) {
      const cost = parseCost(flight.price ?? flight.cost);
      out.push({
        type: 'flight',
        provider: String(flight.airline ?? flight.info ?? 'Flight'),
        cost,
        isSelected: true,
        isOriginal: true,
        id: `${prefix}-flight`,
        raw: flight,
      });
    }
    const hotel = (day.hotel ?? day.accommodation) as Record<string, unknown> | undefined;
    if (hotel != null) {
      const cost = parseCost(hotel.pricePerNight ?? hotel.cost);
      out.push({
        type: 'hotel',
        provider: String(hotel.name ?? hotel.hotelName ?? 'Hotel'),
        cost,
        isSelected: true,
        isOriginal: true,
        id: `${prefix}-hotel`,
        raw: hotel,
      });
    }
    const transport = day.transport as Record<string, unknown> | undefined;
    if (transport != null) {
      const cost = parseCost(transport.price ?? transport.cost);
      out.push({
        type: 'transport',
        provider: String(transport.type ?? transport.info ?? 'Transport'),
        cost,
        isSelected: true,
        isOriginal: true,
        id: `${prefix}-transport`,
        raw: transport,
      });
    }
    const activities = (day.activities ?? []) as Record<string, unknown>[];
    activities.forEach((a, i) => {
      const cost = parseCost(a.cost ?? a.price);
      out.push({
        type: 'activity',
        provider: String(a.name ?? 'Activity'),
        cost,
        isSelected: true,
        isOriginal: true,
        id: `${prefix}-activity-${i}`,
        raw: a,
      });
    });
  });
  return out;
}

/** Map adapter API response to SwapOption[] with price diff from current cost. */
export function parseAdapterResultsToSwapOptions(
  rawList: unknown[],
  currentCost: number
): SwapOption[] {
  return rawList.slice(0, 10).map((item, i) => {
    const r = item as Record<string, unknown>;
    const cost = parseCost(r.price ?? r.cost ?? r.pricePerNight);
    return {
      id: `alt-${i}-${String(r.id ?? r.name ?? i)}`,
      provider: String(r.name ?? r.airline ?? r.type ?? 'Option'),
      cost,
      priceDifference: cost - currentCost,
      raw: r,
    };
  });
}

/** Sum cost of all currently selected services. */
export function calculateTotalCost(services: EditableService[]): number {
  return services
    .filter((s) => s.isSelected)
    .reduce((sum, s) => sum + s.cost, 0);
}

/** Numeric price difference (alternative - original). Negative = cheaper. */
export function getPriceDifference(
  originalCost: number,
  alternativeCost: number
): number {
  return alternativeCost - originalCost;
}

/** Whether current total exceeds budget. */
export function exceedsBudget(totalCost: number, totalBudget: number): boolean {
  return totalCost > totalBudget;
}

/** Formatted price diff and whether it's cheaper (for green/red). */
export function formatPriceDiff(diff: number): { text: string; isCheaper: boolean } {
  const isCheaper = diff < 0;
  const sign = diff >= 0 ? '+' : '';
  return {
    text: `${sign}$${Math.abs(Math.round(diff))}`,
    isCheaper,
  };
}

export function getTripBudget(trip: Record<string, unknown>): number {
  const v = trip.totalBudget ?? trip.total_budget;
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}
