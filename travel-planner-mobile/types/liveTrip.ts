import type { LatLng } from 'react-native-maps';
import type { TripDetailView } from '@/types/trip';
import type { BudgetBreakdownView } from '@/types/budget';

export type LiveStopKind = 'flight' | 'hotel' | 'transport' | 'activity' | 'booking' | 'note';

export interface LiveDetailRow {
  label: string;
  value: string;
}

export interface LiveTripStop {
  id: string;
  kind: LiveStopKind;
  title: string;
  subtitle?: string;
  time?: string;
  endTime?: string;
  status?: string;
  cost?: string;
  coordinate: LatLng;
  address?: string;
  details: LiveDetailRow[];
}

export interface LiveTripDay {
  dayIndex: number;
  label: string;
  dateLabel: string;
  title: string;
  dayTotal?: string;
  stops: LiveTripStop[];
}

export interface LiveTripTrackerState {
  trip: TripDetailView;
  days: LiveTripDay[];
  itineraryDays: Record<string, unknown>[];
  budgetView: BudgetBreakdownView | null;
  hotel?: {
    hotelName: string;
    location: string;
    latitude?: number;
    longitude?: number;
  };
}
