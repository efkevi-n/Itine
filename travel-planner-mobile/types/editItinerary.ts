/** Single service (flight, hotel, transport, activity) that can be swapped. */
export interface EditableService {
  type: 'flight' | 'hotel' | 'transport' | 'activity';
  provider: string;
  cost: number;
  isSelected: boolean;
  isOriginal: boolean;
  /** Unique key for list (e.g. dayIndex-type or id from API). */
  id: string;
  /** Raw payload for PATCH; optional. */
  raw?: Record<string, unknown>;
}

/** Current edit state: selections and computed total. */
export interface ItineraryEdit {
  services: EditableService[];
  totalCost: number;
}

/** One alternative option with price vs current. */
export interface SwapOption {
  id: string;
  provider: string;
  cost: number;
  priceDifference: number;
  raw?: Record<string, unknown>;
}
