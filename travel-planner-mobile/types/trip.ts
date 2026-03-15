/**
 * Trip and booking types for Trip Detail and related screens.
 * Status colors match spec: PENDING grey, CONFIRMED blue, ACTIVE green, COMPLETED dark grey, CANCELLED red.
 */

export type TripStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export const STATUS_COLORS: Record<string, string> = {
  PENDING: '#94a3b8',
  CONFIRMED: '#38bdf8',
  ACTIVE: '#22c55e',
  COMPLETED: '#64748b',
  CANCELLED: '#ef4444',
};

/** Trip data for Trip Detail header/summary (from API or normalized) */
export interface TripDetailView {
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency: string;
  status: string;
}

/** Booking item for list (from API or normalized) */
export interface BookingDetailView {
  id?: number;
  serviceId?: number;
  serviceType: string;
  providerName: string;
  reference?: string;
  validFrom?: string;
  validUntil?: string;
  status: string;
}
