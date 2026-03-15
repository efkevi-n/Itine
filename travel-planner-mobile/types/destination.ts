/** Single suggestion for destination/place autocomplete. */
export interface DestinationSuggestion {
  city: string;
  country: string;
  flag: string;
}

/** Stored recent search entry. */
export interface RecentSearch {
  city: string;
  country: string;
  searchedAt: number;
}
