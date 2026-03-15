import type { DestinationSuggestion } from '@/types/destination';

export const POPULAR_DESTINATIONS: DestinationSuggestion[] = [
  { city: 'Istanbul', country: 'Turkey', flag: '🇹🇷' },
  { city: 'Barcelona', country: 'Spain', flag: '🇪🇸' },
  { city: 'Bangkok', country: 'Thailand', flag: '🇹🇭' },
  { city: 'Dubai', country: 'UAE', flag: '🇦🇪' },
  { city: 'Rome', country: 'Italy', flag: '🇮🇹' },
];

export const MAX_RECENT_SEARCHES = 5;
export const AUTOCOMPLETE_DEBOUNCE_MS = 300;
export const AUTOCOMPLETE_SUGGESTIONS_LIMIT = 5;
