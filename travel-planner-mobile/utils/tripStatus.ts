import { STATUS_COLORS, type TripStatus } from '@/types/trip';

export function getStatusColor(status: string): string {
  const key = normalizeTripStatus(status);
  return STATUS_COLORS[key] ?? '#94a3b8';
}

/** Map API / legacy status strings to the five app statuses. */
export function normalizeTripStatus(value: unknown): TripStatus {
  const s = String(value ?? 'PENDING').trim().replace(/[\s-]+/g, '_').toUpperCase();
  if (s === 'CANCELED') return 'CANCELLED';
  if (['ACTIVE', 'IN_PROGRESS', 'ONGOING'].includes(s)) return 'ACTIVE';
  if (['CONFIRMED', 'BOOKED', 'APPROVED', 'UPCOMING'].includes(s)) return 'CONFIRMED';
  if (['COMPLETED', 'COMPLETE', 'FINISHED'].includes(s)) return 'COMPLETED';
  if (['CANCELLED', 'CANCELED', 'VOID'].includes(s)) return 'CANCELLED';
  return 'PENDING';
}

export function canCancelTrip(status: string): boolean {
  const s = normalizeTripStatus(status);
  return s === 'PENDING' || s === 'CONFIRMED';
}

export function canDeleteTrip(status: string): boolean {
  const s = normalizeTripStatus(status);
  return s === 'COMPLETED' || s === 'CANCELLED';
}

export function isQrPassAvailable(status: string): boolean {
  const s = normalizeTripStatus(status);
  return s === 'CONFIRMED' || s === 'ACTIVE';
}

/** Trip has been confirmed / booked (itinerary locked on server may differ from draft). */
export function isBookedTripStatus(status: string): boolean {
  const s = status.toUpperCase();
  return s === 'CONFIRMED' || s === 'ACTIVE' || s === 'COMPLETED';
}

/** Whether the user can open the itinerary editor (only before booking / confirm). */
export function canEditTrip(status: string): boolean {
  return status.toUpperCase() === 'PENDING';
}
