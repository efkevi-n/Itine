export type ConnectivityStatus = 'online' | 'offline' | 'unknown';

export interface CachedTrip {
  data: Record<string, unknown>;
  cachedAt: number;
}

export interface CachedItinerary {
  data: Record<string, unknown>;
  cachedAt: number;
}

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: unknown;
  queuedAt: string;
}
