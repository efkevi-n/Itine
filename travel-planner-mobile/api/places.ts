import axios from 'axios';
import type { DestinationSuggestion } from '@/types/destination';
import { getFlagFromCountryCode } from '@/utils/countryFlag';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const REQUEST_TIMEOUT_MS = 8000;

interface NominatimItem {
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    country_code?: string;
  };
}

const placesClient = axios.create({
  baseURL: NOMINATIM_BASE,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Accept-Language': 'en',
    'User-Agent': 'TravelPlannerMobile/1.0',
  },
});

function parseItem(item: NominatimItem): DestinationSuggestion | null {
  const addr = item.address;
  const city =
    addr?.city ?? addr?.town ?? addr?.village ?? item.name ?? '';
  const country = addr?.country ?? '';
  if (!city.trim()) return null;
  return {
    city: city.trim(),
    country: country.trim() || 'Unknown',
    flag: getFlagFromCountryCode(addr?.country_code),
  };
}

/**
 * Fetches place suggestions from Nominatim (OpenStreetMap). Use for destination/origin autocomplete.
 */
export async function fetchPlaceSuggestions(
  query: string,
  limit = 5
): Promise<DestinationSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const encoded = encodeURIComponent(trimmed);
  const res = await placesClient.get<NominatimItem[]>(
    `/search?q=${encoded}&format=json&limit=${limit}&addressdetails=1`
  );
  const list = Array.isArray(res.data) ? res.data : [];
  const seen = new Set<string>();
  const out: DestinationSuggestion[] = [];
  for (const item of list) {
    const suggestion = parseItem(item);
    if (!suggestion) continue;
    const key = `${suggestion.city.toLowerCase()}|${suggestion.country.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(suggestion);
  }
  return out;
}
