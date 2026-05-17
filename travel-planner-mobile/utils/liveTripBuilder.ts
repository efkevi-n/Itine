import type { ItineraryDayRaw } from '@/api/itinerary';
import type { BookingDetailView, TripDetailView } from '@/types/trip';
import type { BudgetBreakdownView } from '@/types/budget';
import type { LiveDetailRow, LiveTripDay, LiveTripStop, LiveTripTrackerState } from '@/types/liveTrip';
import {
  coordinateFromRaw,
  getDestinationCoordinate,
  offsetCoordinate,
  readString,
} from '@/utils/tripCoordinates';

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord | undefined {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RawRecord)
    : undefined;
}

function parseNum(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

function formatMoney(amount: number, currency: string): string {
  const sym =
    currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
  return `${sym}${Math.round(amount).toLocaleString()}`;
}

function formatTime(value: string | undefined, fallback = ''): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function dayDateLabel(startDate: string, dayIndex: number): string {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return `Day ${dayIndex + 1}`;
  const d = new Date(start);
  d.setDate(d.getDate() + dayIndex);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function detailsFromRaw(raw: RawRecord, extra: LiveDetailRow[] = []): LiveDetailRow[] {
  const rows: LiveDetailRow[] = [...extra];
  const skip = new Set(['latitude', 'lat', 'longitude', 'lng', 'lon', 'location', 'coordinates', 'geo']);
  for (const [key, value] of Object.entries(raw)) {
    if (skip.has(key) || value == null) continue;
    if (typeof value === 'object') continue;
    const str = String(value).trim();
    if (!str) continue;
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim();
    rows.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value: str });
  }
  return rows.slice(0, 12);
}

function assignCoordinate(
  raw: RawRecord | undefined,
  base: ReturnType<typeof getDestinationCoordinate>,
  stopIndex: number,
  totalStops: number,
): ReturnType<typeof getDestinationCoordinate> {
  return coordinateFromRaw(raw) ?? offsetCoordinate(base, stopIndex, totalStops);
}

function buildFlightStop(raw: RawRecord, id: string, currency: string, coord: LiveTripStop['coordinate']): LiveTripStop {
  const airline = readString(raw, ['airline', 'carrier', 'provider']);
  const flightNo = readString(raw, ['flightNumber', 'reference', 'number']);
  const from = readString(raw, ['from', 'origin', 'departureCode']);
  const to = readString(raw, ['to', 'destination', 'arrivalCode']);
  const cost = parseNum(raw.cost ?? raw.price);
  return {
    id,
    kind: 'flight',
    title: readString(raw, ['title', 'name']) || `Flight ${from} → ${to}`.trim() || 'Flight',
    subtitle: [airline, flightNo].filter(Boolean).join(' • '),
    time: formatTime(readString(raw, ['departureTime', 'departTime', 'validFrom']), ''),
    endTime: formatTime(readString(raw, ['arrivalTime', 'arriveTime', 'validUntil']), ''),
    status: readString(raw, ['status']) || 'Confirmed',
    cost: cost > 0 ? formatMoney(cost, currency) : undefined,
    coordinate: coord,
    address: readString(raw, ['terminal', 'gate', 'airport']),
    details: detailsFromRaw(raw, [
      { label: 'From', value: from },
      { label: 'To', value: to },
      { label: 'Airline', value: airline },
      { label: 'Flight', value: flightNo },
      { label: 'Terminal', value: readString(raw, ['terminal']) },
      { label: 'Gate', value: readString(raw, ['gate']) },
      { label: 'Seat', value: readString(raw, ['seat']) },
      { label: 'Baggage', value: readString(raw, ['baggage']) },
    ].filter((r) => r.value)),
  };
}

function buildHotelStop(raw: RawRecord, id: string, currency: string, coord: LiveTripStop['coordinate']): LiveTripStop {
  const name = readString(raw, ['name', 'hotelName', 'title']) || 'Hotel';
  const cost = parseNum(raw.cost ?? raw.price);
  return {
    id,
    kind: 'hotel',
    title: name,
    subtitle: readString(raw, ['roomType', 'category']),
    time: formatTime(readString(raw, ['checkInTime', 'checkIn', 'validFrom']), '3:00 PM'),
    endTime: formatTime(readString(raw, ['checkOutTime', 'checkOut', 'validUntil']), '11:00 AM'),
    status: readString(raw, ['status']) || 'Confirmed',
    cost: cost > 0 ? formatMoney(cost, currency) : undefined,
    coordinate: coord,
    address: readString(raw, ['address', 'location', 'city']),
    details: detailsFromRaw(raw, [
      { label: 'Address', value: readString(raw, ['address']) },
      { label: 'Room', value: readString(raw, ['roomType']) },
      { label: 'Confirmation', value: readString(raw, ['confirmation', 'reference']) },
      { label: 'Phone', value: readString(raw, ['phone', 'contact']) },
    ].filter((r) => r.value)),
  };
}

function buildTransportStop(raw: RawRecord, id: string, currency: string, coord: LiveTripStop['coordinate']): LiveTripStop {
  const cost = parseNum(raw.cost ?? raw.price);
  return {
    id,
    kind: 'transport',
    title: readString(raw, ['title', 'name', 'mode']) || 'Transport',
    subtitle: readString(raw, ['provider', 'company']),
    time: formatTime(readString(raw, ['departureTime', 'startTime', 'validFrom']), ''),
    endTime: formatTime(readString(raw, ['arrivalTime', 'endTime', 'validUntil']), ''),
    status: readString(raw, ['status']) || 'Scheduled',
    cost: cost > 0 ? formatMoney(cost, currency) : undefined,
    coordinate: coord,
    address: readString(raw, ['pickup', 'dropoff', 'route']),
    details: detailsFromRaw(raw),
  };
}

function buildActivityStop(raw: RawRecord, id: string, currency: string, coord: LiveTripStop['coordinate']): LiveTripStop {
  const cost = parseNum(raw.cost ?? raw.price);
  return {
    id,
    kind: 'activity',
    title: readString(raw, ['name', 'title', 'activity']) || 'Activity',
    subtitle: readString(raw, ['category', 'type']),
    time: formatTime(readString(raw, ['time', 'startTime', 'validFrom']), ''),
    endTime: formatTime(readString(raw, ['endTime', 'duration']), ''),
    status: readString(raw, ['status']) || 'Scheduled',
    cost: cost > 0 ? formatMoney(cost, currency) : undefined,
    coordinate: coord,
    address:
      readString(raw, ['address', 'locationName', 'place']) ||
      readString(asRecord(raw.location), ['name', 'address']),
    details: detailsFromRaw(raw, [
      { label: 'Duration', value: readString(raw, ['duration']) },
      { label: 'Notes', value: readString(raw, ['notes', 'description']) },
    ].filter((r) => r.value)),
  };
}

function buildBookingStop(
  booking: BookingDetailView,
  raw: RawRecord,
  id: string,
  currency: string,
  coord: LiveTripStop['coordinate'],
): LiveTripStop {
  const kind = booking.serviceType.toLowerCase().includes('flight')
    ? 'flight'
    : booking.serviceType.toLowerCase().includes('hotel')
      ? 'hotel'
      : booking.serviceType.toLowerCase().includes('transport')
        ? 'transport'
        : 'booking';

  return {
    id,
    kind: kind as LiveTripStop['kind'],
    title: booking.providerName || 'Booking',
    subtitle: booking.serviceType,
    time: formatTime(booking.validFrom, ''),
    endTime: formatTime(booking.validUntil, ''),
    status: booking.status || 'Confirmed',
    coordinate: coord,
    address: readString(raw, ['address', 'locationAddress', 'location']),
    details: [
      { label: 'Reference', value: booking.reference ?? '' },
      { label: 'Service type', value: booking.serviceType },
      { label: 'Status', value: booking.status },
      { label: 'Valid from', value: booking.validFrom ?? '' },
      { label: 'Valid until', value: booking.validUntil ?? '' },
    ].filter((r) => r.value),
  };
}

export function buildLiveTripPlan(
  trip: TripDetailView,
  itineraryDays: ItineraryDayRaw[],
  bookings: BookingDetailView[],
  rawBookings: RawRecord[],
  budgetView: BudgetBreakdownView | null,
): LiveTripTrackerState {
  const baseCoord = getDestinationCoordinate(trip.destination);
  const currency = trip.currency;
  const days: LiveTripDay[] = [];

  if (itineraryDays.length > 0) {
    itineraryDays.forEach((dayRaw, dayIndex) => {
      const day = dayRaw as RawRecord;
      const stops: LiveTripStop[] = [];
      let stopIndex = 0;

      const flight = asRecord(day.flight);
      const hotel = asRecord(day.hotel ?? day.accommodation);
      const transport = asRecord(day.transport);
      const activities = Array.isArray(day.activities) ? day.activities : [];

      const plannedCount =
        (flight ? 1 : 0) + (hotel ? 1 : 0) + (transport ? 1 : 0) + activities.length;
      const total = Math.max(plannedCount, 1);

      if (flight) {
        stops.push(
          buildFlightStop(
            flight,
            `d${dayIndex}-flight`,
            currency,
            assignCoordinate(flight, baseCoord, stopIndex++, total),
          ),
        );
      }
      if (hotel) {
        stops.push(
          buildHotelStop(
            hotel,
            `d${dayIndex}-hotel`,
            currency,
            assignCoordinate(hotel, baseCoord, stopIndex++, total),
          ),
        );
      }
      if (transport) {
        stops.push(
          buildTransportStop(
            transport,
            `d${dayIndex}-transport`,
            currency,
            assignCoordinate(transport, baseCoord, stopIndex++, total),
          ),
        );
      }
      activities.forEach((act, ai) => {
        const actRaw = asRecord(act);
        if (!actRaw) return;
        stops.push(
          buildActivityStop(
            actRaw,
            `d${dayIndex}-act-${ai}`,
            currency,
            assignCoordinate(actRaw, baseCoord, stopIndex++, total),
          ),
        );
      });

      const dayTotal = parseNum(day.dayTotal ?? day.total);
      days.push({
        dayIndex,
        label: `Day ${dayIndex + 1}`,
        dateLabel: dayDateLabel(trip.startDate, dayIndex),
        title: readString(day, ['title', 'summary', 'name']) || `Day ${dayIndex + 1}`,
        dayTotal: dayTotal > 0 ? formatMoney(dayTotal, currency) : undefined,
        stops,
      });
    });
  }

  if (days.length === 0 && bookings.length > 0) {
    const grouped = new Map<number, { booking: BookingDetailView; raw: RawRecord }[]>();
    bookings.forEach((b, i) => {
      const raw = rawBookings[i] ?? {};
      const validFrom = b.validFrom ?? trip.startDate;
      const start = new Date(trip.startDate);
      const d = new Date(validFrom);
      start.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      const dayIndex = Math.max(
        0,
        Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
      );
      const list = grouped.get(dayIndex) ?? [];
      list.push({ booking: b, raw });
      grouped.set(dayIndex, list);
    });

    Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([dayIndex, list]) => {
        const stops = list.map(({ booking, raw }, i) =>
          buildBookingStop(
            booking,
            raw,
            `b-${dayIndex}-${i}`,
            currency,
            assignCoordinate(raw, baseCoord, i, list.length),
          ),
        );
        days.push({
          dayIndex,
          label: `Day ${dayIndex + 1}`,
          dateLabel: dayDateLabel(trip.startDate, dayIndex),
          title: `Bookings — ${dayDateLabel(trip.startDate, dayIndex)}`,
          stops,
        });
      });
  }

  const firstHotel = itineraryDays.map((d) => asRecord((d as RawRecord).hotel ?? (d as RawRecord).accommodation)).find(Boolean);
  const hotelCoord = coordinateFromRaw(firstHotel);
  const hotel = firstHotel
    ? {
        hotelName: readString(firstHotel, ['name', 'hotelName']) || 'Hotel',
        location: readString(firstHotel, ['address', 'city', 'location']) || trip.destination,
        latitude: hotelCoord?.latitude,
        longitude: hotelCoord?.longitude,
      }
    : {
        hotelName: 'Base stay',
        location: trip.destination,
        latitude: baseCoord.latitude,
        longitude: baseCoord.longitude,
      };

  return {
    trip,
    days,
    itineraryDays: itineraryDays as Record<string, unknown>[],
    budgetView,
    hotel,
  };
}
