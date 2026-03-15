import type { Router } from 'expo-router';
import { getAccessToken } from '@/utils/auth';
import { DEEP_LINK_SCHEME } from '@/constants/deepLinks';
import type { DeepLinkRoute, ParsedDeepLink } from '@/types/deepLink';

const TRIP_PREFIX = `${DEEP_LINK_SCHEME}://trip/`;
const TRIPPASS_PREFIX = `${DEEP_LINK_SCHEME}://trippass/`;
const ITINERARY_PREFIX = `${DEEP_LINK_SCHEME}://itinerary/`;

let pendingDeepLinkUrl: string | null = null;

export function setPendingDeepLink(url: string): void {
  pendingDeepLinkUrl = url;
}

export function getPendingDeepLink(): string | null {
  return pendingDeepLinkUrl;
}

export function clearPendingDeepLink(): void {
  pendingDeepLinkUrl = null;
}

function takeIdAfterPrefix(url: string, prefix: string): string | null {
  const rest = url.trim().slice(prefix.length).replace(/^\/+/, '').split('/')[0];
  return rest && rest.length > 0 ? rest : null;
}

export function parseDeepLink(url: string): ParsedDeepLink | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const tripId = takeIdAfterPrefix(trimmed, TRIP_PREFIX);
  if (trimmed.startsWith(TRIP_PREFIX) && tripId) {
    return { route: 'trip', params: { tripId } };
  }
  const jti = takeIdAfterPrefix(trimmed, TRIPPASS_PREFIX);
  if (trimmed.startsWith(TRIPPASS_PREFIX) && jti) {
    return { route: 'trippass', params: { jti } };
  }
  const itineraryTripId = takeIdAfterPrefix(trimmed, ITINERARY_PREFIX);
  if (trimmed.startsWith(ITINERARY_PREFIX) && itineraryTripId) {
    return { route: 'itinerary', params: { tripId: itineraryTripId } };
  }
  return null;
}

export async function handleDeepLink(url: string, router: Router): Promise<void> {
  const parsed = parseDeepLink(url);
  if (!parsed) return;

  const token = await getAccessToken();
  if (!token) {
    setPendingDeepLink(url);
    router.replace('/login');
    return;
  }

  if (parsed.route === 'trip' && parsed.params.tripId) {
    router.push({ pathname: '/trip-detail', params: { tripId: parsed.params.tripId } });
    return;
  }
  if (parsed.route === 'trippass' && parsed.params.jti) {
    router.push({ pathname: '/qr-pass', params: { jti: parsed.params.jti } });
    return;
  }
  if (parsed.route === 'itinerary' && parsed.params.tripId) {
    router.push({ pathname: '/itinerary-review', params: { tripId: parsed.params.tripId } });
    return;
  }
}

export function getDeepLinkForTrip(tripId: string): string {
  return `${DEEP_LINK_SCHEME}://trip/${tripId}`;
}

export function getDeepLinkForTripPass(jti: string): string {
  return `${DEEP_LINK_SCHEME}://trippass/${jti}`;
}
