import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_KEYS, CACHE_TTL_MS } from '@/constants/offline';
import type { CachedTrip, CachedItinerary } from '@/types/offline';

function tripKey(tripId: string): string {
  return `${CACHE_KEYS.trips}_${tripId}`;
}

function itineraryKey(tripId: string): string {
  return `${CACHE_KEYS.itineraries}_${tripId}`;
}

function tripPassKey(tripId: string): string {
  return `${CACHE_KEYS.tripPass}_${tripId}`;
}

function isExpired(cachedAt: number): boolean {
  return Date.now() - cachedAt > CACHE_TTL_MS;
}

export async function cacheTrip(tripId: string, data: Record<string, unknown>): Promise<void> {
  try {
    const payload: CachedTrip = { data, cachedAt: Date.now() };
    await AsyncStorage.setItem(tripKey(tripId), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export async function getCachedTrip(tripId: string): Promise<CachedTrip | null> {
  try {
    const raw = await AsyncStorage.getItem(tripKey(tripId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTrip;
    if (isExpired(parsed.cachedAt)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getCachedTripIds(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const prefix = `${CACHE_KEYS.trips}_`;
    return keys.filter((k) => k.startsWith(prefix)).map((k) => k.replace(prefix, ''));
  } catch {
    return [];
  }
}

export async function cacheItinerary(tripId: string, data: Record<string, unknown>): Promise<void> {
  try {
    const payload: CachedItinerary = { data, cachedAt: Date.now() };
    await AsyncStorage.setItem(itineraryKey(tripId), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export async function getCachedItinerary(tripId: string): Promise<CachedItinerary | null> {
  try {
    const raw = await AsyncStorage.getItem(itineraryKey(tripId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedItinerary;
    if (isExpired(parsed.cachedAt)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function cacheTripPass(tripId: string, data: Record<string, unknown>): Promise<void> {
  try {
    const payload = { data, cachedAt: Date.now() };
    await AsyncStorage.setItem(tripPassKey(tripId), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export async function getCachedTripPass(tripId: string): Promise<{ data: Record<string, unknown>; cachedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(tripPassKey(tripId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: Record<string, unknown>; cachedAt: number };
    if (isExpired(parsed.cachedAt)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearExpiredCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove: string[] = [];
    for (const key of keys) {
      if (!key.startsWith(CACHE_KEYS.trips) && !key.startsWith(CACHE_KEYS.itineraries) && !key.startsWith(CACHE_KEYS.tripPass)) continue;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw) as { cachedAt?: number };
        if (typeof obj.cachedAt === 'number' && isExpired(obj.cachedAt)) toRemove.push(key);
      } catch {
        toRemove.push(key);
      }
    }
    if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
  } catch {
    // ignore
  }
}
