import type { ActiveServiceItem, CurrentDayInfo } from '@/types/activeTrip';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Get 0-based day index for a date within trip range; totalDays = end - start in days. */
export function getCurrentTripDay(startDate: string, endDate: string): CurrentDayInfo | null {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || today < start || today > end) {
    return null;
  }
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY));
  const dayIndex = Math.floor((today.getTime() - start.getTime()) / MS_PER_DAY);
  return { dayIndex, totalDays, isToday: true };
}

/** Format milliseconds to "2h 30m" or "45m" or "In progress". */
export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'In progress';
  const totalM = Math.floor(msRemaining / 60000);
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return 'Soon';
}

function dayIndexFromDate(dateStr: string, tripStartDate: string): number {
  const d = new Date(dateStr);
  const start = new Date(tripStartDate);
  d.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  if (isNaN(d.getTime()) || isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((d.getTime() - start.getTime()) / MS_PER_DAY));
}

/** Build ActiveServiceItem from raw booking; dayIndex from validFrom vs tripStartDate. */
export function toActiveServiceItem(
  raw: Record<string, unknown>,
  tripStartDate: string,
  currentDayIndex: number
): ActiveServiceItem {
  const validFrom = raw.validFrom != null ? String(raw.validFrom) : raw.valid_from != null ? String(raw.valid_from) : undefined;
  const dayIndex = validFrom ? dayIndexFromDate(validFrom, tripStartDate) : 0;

  const isUsed = raw.isUsed === true || String(raw.status ?? '').toLowerCase() === 'used';
  let statusDisplay: ActiveServiceItem['statusDisplay'] = 'upcoming';
  if (isUsed) statusDisplay = 'used';
  else if (dayIndex > currentDayIndex) statusDisplay = 'not_yet_active';
  else if (dayIndex <= currentDayIndex) statusDisplay = 'upcoming';

  const timeLabel = validFrom ? formatTimeLabel(validFrom) : undefined;
  const serviceType = String(raw.serviceType ?? raw.type ?? raw.category ?? 'activity').toLowerCase();

  return {
    id: typeof raw.id === 'number' ? raw.id : undefined,
    serviceId: typeof raw.serviceId === 'number' ? raw.serviceId : undefined,
    serviceType,
    providerName: String(raw.providerName ?? raw.provider ?? '—'),
    reference: raw.reference != null ? String(raw.reference) : undefined,
    timeLabel,
    validFrom,
    validUntil: raw.validUntil != null ? String(raw.validUntil) : raw.valid_until != null ? String(raw.valid_until) : undefined,
    isUsed,
    statusDisplay,
    dayIndex,
    locationAddress: raw.locationAddress != null ? String(raw.locationAddress) : raw.address != null ? String(raw.address) : undefined,
  };
}

function formatTimeLabel(isoOrDate: string): string {
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Get next upcoming service (not used, today or future, earliest time). */
export function getNextUpcomingService(items: ActiveServiceItem[], currentDayIndex: number): ActiveServiceItem | null {
  const upcoming = items.filter((s) => s.statusDisplay === 'upcoming' && s.dayIndex <= currentDayIndex);
  if (upcoming.length === 0) return null;
  upcoming.sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    const tA = a.validFrom ? new Date(a.validFrom).getTime() : 0;
    const tB = b.validFrom ? new Date(b.validFrom).getTime() : 0;
    return tA - tB;
  });
  return upcoming[0] ?? null;
}

/** Milliseconds until a service (validFrom); if in past returns 0. */
export function msUntilService(validFrom?: string): number {
  if (!validFrom) return 0;
  const d = new Date(validFrom);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, d.getTime() - Date.now());
}
