const HOUR_MS = 60 * 60 * 1000;

export const CACHE_TTL_MS = 24 * HOUR_MS;

export const CACHE_KEYS = {
  trips: 'offline_trips',
  itineraries: 'offline_itineraries',
  tripPass: 'offline_trippass',
} as const;

export const MAX_QUEUE_SIZE = 10;

export const OFFLINE_MESSAGES = {
  cannotCreateTrip: 'Cannot create trip while offline',
  offlineOtpWarning: 'Offline mode — OTP may be expired',
  offlineCachedPass: 'Offline mode — using cached pass',
  backOnlineSyncing: 'Back online — syncing...',
} as const;
