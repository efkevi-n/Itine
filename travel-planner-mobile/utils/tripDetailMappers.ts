import type { TripDetailView, BookingDetailView } from '@/types/trip';

function parseNum(v: unknown): number {
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

export function mapTripToDetailView(raw: Record<string, unknown>): TripDetailView {
  return {
    destination: String(raw.destination ?? ''),
    startDate: String(raw.startDate ?? raw.start_date ?? ''),
    endDate: String(raw.endDate ?? raw.end_date ?? ''),
    totalBudget: parseNum(raw.totalBudget ?? raw.total_budget),
    currency: String(raw.currency ?? 'USD'),
    status: String(raw.status ?? 'PENDING').toUpperCase(),
  };
}

function serviceTypeFrom(raw: Record<string, unknown>): string {
  const t = (raw.type ?? raw.serviceType ?? raw.category ?? 'activity') as string;
  return String(t);
}

export function mapBookingToDetailView(raw: Record<string, unknown>): BookingDetailView {
  return {
    id: typeof raw.id === 'number' ? raw.id : undefined,
    serviceId: typeof raw.serviceId === 'number' ? raw.serviceId : undefined,
    serviceType: serviceTypeFrom(raw),
    providerName: String(raw.providerName ?? raw.provider ?? '—'),
    reference: raw.reference != null ? String(raw.reference) : undefined,
    validFrom: raw.validFrom != null ? String(raw.validFrom) : raw.valid_from != null ? String(raw.valid_from) : undefined,
    validUntil: raw.validUntil != null ? String(raw.validUntil) : raw.valid_until != null ? String(raw.valid_until) : undefined,
    status: String(raw.status ?? 'active'),
  };
}
