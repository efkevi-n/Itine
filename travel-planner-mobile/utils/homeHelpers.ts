import type { TripCardData } from '@/components/TripCard';
import type { WeatherSnapshot } from '@/services/weatherApi';

export interface TransportGuide {
  city: string;
  airport: string;
  systems: string[];
  taxi: string;
}

export type WeatherLoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: WeatherSnapshot }
  | { status: 'error' };

export const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#38BDF8',
  ACTIVE: '#22C55E',
  COMPLETED: '#94A3B8',
  CANCELLED: '#EF4444',
};

const TRANSPORT_GUIDES: TransportGuide[] = [
  { city: 'rome', airport: 'Leonardo Express connects Fiumicino Airport with Roma Termini.', systems: ['Metro', 'Leonardo Express', 'regional rail'], taxi: 'Use official white taxis from marked ranks.' },
  { city: 'paris', airport: 'RER B and airport buses connect CDG and Orly with central Paris.', systems: ['Metro', 'RER', 'tram'], taxi: 'Use official taxis from signed airport and station ranks.' },
  { city: 'istanbul', airport: 'Havaist coaches and Metro links are common airport-to-city options.', systems: ['Metro', 'Havaist', 'Marmaray'], taxi: 'Use official taxis or trusted app-based rides.' },
  { city: 'london', airport: 'Elizabeth line, Heathrow Express, Gatwick Express, and Underground links serve major airports.', systems: ['Underground', 'Elizabeth line', 'National Rail'], taxi: 'Black cabs and licensed private-hire rides are widely used.' },
  { city: 'tokyo', airport: 'Airport rail links connect Narita and Haneda with major Tokyo hubs.', systems: ['JR', 'Tokyo Metro', 'airport rail'], taxi: 'Taxis are reliable but usually best for shorter city transfers.' },
  { city: 'amsterdam', airport: 'Schiphol trains reach Amsterdam Centraal in a short direct ride.', systems: ['NS', 'GVB', 'Schiphol train'], taxi: 'Use official taxi stands or trusted app-based rides.' },
  { city: 'barcelona', airport: 'Aerobus and Metro links connect the airport with central Barcelona.', systems: ['Metro', 'Aerobus', 'Rodalies'], taxi: 'Official black-and-yellow taxis are available at airport ranks.' },
  { city: 'ankara', airport: 'Airport shuttles and EGO connections serve central Ankara routes.', systems: ['Metro', 'EGO buses', 'airport shuttle'], taxi: 'Use official taxis from marked ranks.' },
];

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): value is RawRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function getRawList(payload: unknown): RawRecord[] {
  const keys = ['data', 'trips', 'items', 'results', 'docs', 'rows'];
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
      const nested = read(value[key]);
      if (nested.length > 0) return nested;
    }
    return [];
  };
  return read(payload);
}

function readStr(raw: RawRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const v = raw[key];
    if (v != null && String(v).trim().length > 0) return String(v).trim();
  }
  return fallback;
}

function readNum(raw: RawRecord, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const p = Number(v.replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(p)) return p;
    }
  }
  return fallback;
}

function normalizeStatus(value: unknown): TripCardData['status'] {
  const s = String(value ?? 'PENDING').trim().replace(/[\s-]+/g, '_').toUpperCase();
  if (s === 'CANCELED') return 'CANCELLED';
  if (['ACTIVE', 'IN_PROGRESS', 'ONGOING'].includes(s)) return 'ACTIVE';
  if (['CONFIRMED', 'BOOKED', 'APPROVED', 'UPCOMING'].includes(s)) return 'CONFIRMED';
  if (['COMPLETED', 'COMPLETE', 'FINISHED'].includes(s)) return 'COMPLETED';
  if (['CANCELLED', 'CANCELED', 'VOID'].includes(s)) return 'CANCELLED';
  return 'PENDING';
}

export function normalizeTrip(raw: RawRecord): TripCardData {
  return {
    id: readStr(raw, ['id', 'tripId', 'trip_id', '_id']),
    destination: readStr(raw, ['destination', 'destinationName', 'location']),
    startDate: readStr(raw, ['startDate', 'start_date', 'departureDate', 'departure_date']),
    endDate: readStr(raw, ['endDate', 'end_date', 'returnDate', 'return_date']),
    totalBudget: readNum(raw, ['totalBudget', 'total_budget', 'budget']),
    currency: readStr(raw, ['currency'], 'USD'),
    status: normalizeStatus(raw.status ?? raw.tripStatus ?? raw.state),
  };
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 18) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

export function getTripTime(value: string): number | null {
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

export function getRelativeTripTime(startDate: string): string {
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return 'Schedule unavailable';
  const diffMs = d.getTime() - Date.now();
  const dayDiff = Math.ceil(Math.abs(diffMs) / 86400000);
  if (dayDiff === 0) return 'Today';
  return diffMs >= 0 ? `${dayDiff} days left` : `${dayDiff} days ago`;
}

export function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (d: string) => {
    const date = new Date(d);
    if (isNaN(date.getTime())) return 'TBD';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const year = endDate ? new Date(endDate).getFullYear() : '';
  return `${fmt(startDate)} – ${fmt(endDate)}${year ? `, ${year}` : ''}`;
}

export function getCity(destination: string): string {
  return destination.split(',')[0]?.trim() || destination || 'Destination';
}

export function getTransportGuide(destination: string): TransportGuide {
  const normalized = destination.toLowerCase();
  return (
    TRANSPORT_GUIDES.find((g) => normalized.includes(g.city)) ?? {
      city: getCity(destination),
      airport: 'Check official airport and city transit guidance before departure.',
      systems: ['Public transit', 'airport transfer', 'official taxis'],
      taxi: 'Use licensed taxis, hotel-arranged transfers, or trusted ride apps.',
    }
  );
}

export type HomeTripFilter = 'all' | 'upcoming' | 'active' | 'completed';

export function filterTripsByTab(
  list: TripCardData[],
  tab: HomeTripFilter,
): TripCardData[] {
  switch (tab) {
    case 'active':
      return list.filter((t) => t.status === 'ACTIVE');
    case 'completed':
      return list.filter((t) => t.status === 'COMPLETED');
    case 'upcoming':
      return list.filter((t) => t.status === 'PENDING' || t.status === 'CONFIRMED');
    case 'all':
    default:
      return list;
  }
}

export function getUpcomingTrips(trips: TripCardData[]): TripCardData[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = today.getTime();
  return [...trips]
    .filter((trip) => {
      if (trip.status === 'CANCELLED' || trip.status === 'COMPLETED') return false;
      if (trip.status === 'ACTIVE') return true;
      const endTime = getTripTime(trip.endDate);
      const startTime = getTripTime(trip.startDate);
      if (endTime != null) return endTime >= t;
      if (startTime != null) return startTime >= t;
      return true;
    })
    .sort((a, b) => {
      const aTime = getTripTime(a.startDate) ?? Number.MAX_SAFE_INTEGER;
      const bTime = getTripTime(b.startDate) ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
}

export const weatherKey = (city: string) => city.trim().toLowerCase();
export const formatTemperature = (value: number) => `${Math.round(value)} °C`;
export function getWeatherIconUri(icon: string): string | undefined {
  const t = icon.trim();
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://openweathermap.org/img/wn/${encodeURIComponent(t)}@2x.png`;
}
