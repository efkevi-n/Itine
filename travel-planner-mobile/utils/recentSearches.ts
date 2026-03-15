import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecentSearch } from '@/types/destination';
import { MAX_RECENT_SEARCHES } from '@/constants/destinations';

const STORAGE_KEY = 'recentDestinationSearches';

export async function getRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveRecentSearch(destination: {
  city: string;
  country: string;
}): Promise<void> {
  const list = await getRecentSearches();
  const entry: RecentSearch = {
    city: destination.city,
    country: destination.country,
    searchedAt: Date.now(),
  };
  const filtered = list.filter(
    (r) =>
      !(
        r.city.toLowerCase() === destination.city.toLowerCase() &&
        r.country.toLowerCase() === destination.country.toLowerCase()
      )
  );
  const next = [entry, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
