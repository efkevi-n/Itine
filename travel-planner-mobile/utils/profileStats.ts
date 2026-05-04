/** Trip rows as returned by GET /trips (normalized parsing only). */

export type TripRecord = Record<string, unknown>;

export function parseTripsResponse(payload: unknown): TripRecord[] {
  if (Array.isArray(payload)) {
    return payload as TripRecord[];
  }
  if (
    payload !== null &&
    typeof payload === 'object' &&
    Array.isArray((payload as Record<string, unknown>).data)
  ) {
    return (payload as Record<string, unknown>).data as TripRecord[];
  }
  return [];
}

function tripStatus(raw: TripRecord): string {
  return String(raw.status ?? 'PENDING').toUpperCase();
}

function tripDestination(raw: TripRecord): string {
  return String(raw.destination ?? '').trim();
}

export interface TripStatistics {
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  countriesVisited: number;
}

/**
 * Computes dashboard stats from raw trip rows.
 * "Countries visited" = count of unique non-empty destination strings.
 */
export function computeTripStatistics(trips: TripRecord[]): TripStatistics {
  let activeTrips = 0;
  let completedTrips = 0;
  const destinationSet = new Set<string>();

  for (const t of trips) {
    const status = tripStatus(t);
    if (status === 'ACTIVE') activeTrips += 1;
    if (status === 'COMPLETED') completedTrips += 1;
    const dest = tripDestination(t);
    if (dest) destinationSet.add(dest);
  }

  return {
    totalTrips: trips.length,
    activeTrips,
    completedTrips,
    countriesVisited: destinationSet.size,
  };
}
