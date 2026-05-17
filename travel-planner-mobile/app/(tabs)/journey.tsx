import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { bookingsApi } from '@/api/bookings';
import { itineraryApi } from '@/api/itinerary';
import { tripsApi } from '@/api/trips';
import { userApi } from '@/api/user';
import { FlightTicketCard, type FlightTicketData } from '@/components/journey/FlightTicketCard';
import { HotelBookingCard, type HotelBookingData } from '@/components/journey/HotelBookingCard';
import { JourneyHeader } from '@/components/journey/JourneyHeader';
import { TripRouteMap } from '@/components/journey/TripRouteMap';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatTripDateRange } from '@/utils/dateFormat';
import { mapProfileToView } from '@/utils/profileMappers';
import { mapTripToDetailView } from '@/utils/tripDetailMappers';

type Mode = 'light' | 'dark';
type RawRecord = Record<string, unknown>;

interface JourneyTrip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency: string;
  status: string;
}

const DEFAULT_PASSENGER_NAME = 'Guest Traveler';

function formatEmailLocalPart(email: string): string {
  const localPart = email.split('@')[0]?.trim();
  if (!localPart) return DEFAULT_PASSENGER_NAME;

  return (
    localPart
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ') || DEFAULT_PASSENGER_NAME
  );
}

function passengerNameFromProfile(payload: unknown): string {
  const profile = mapProfileToView((asRecord(payload) ?? {}) as RawRecord);
  const name = profile.name.trim();
  if (name) return name;

  const email = profile.email.trim();
  return email ? formatEmailLocalPart(email) : DEFAULT_PASSENGER_NAME;
}

const DEMO_TRIP: JourneyTrip = {
  id: '',
  destination: 'Tokyo, Japan',
  startDate: '2026-06-12',
  endDate: '2026-06-19',
  totalBudget: 3200,
  currency: 'USD',
  status: 'CONFIRMED',
};

const theme = {
  light: {
    background: '#f3f6fb',
    text: '#101827',
    muted: '#667085',
    card: '#ffffff',
    softCard: 'rgba(255,255,255,0.72)',
    border: 'rgba(15,23,42,0.08)',
    accent: '#2563eb',
    accentSoft: 'rgba(37,99,235,0.11)',
    glowA: 'rgba(37,99,235,0.18)',
    glowB: 'rgba(20,184,166,0.14)',
    shadow: '#94a3b8',
  },
  dark: {
    background: '#0b1020',
    text: '#f8fafc',
    muted: '#94a3b8',
    card: '#151a27',
    softCard: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.08)',
    accent: '#8b9cff',
    accentSoft: 'rgba(139,156,255,0.14)',
    glowA: 'rgba(99,102,241,0.2)',
    glowB: 'rgba(45,212,191,0.12)',
    shadow: '#020617',
  },
};

function asRecord(value: unknown): RawRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : undefined;
}

function sourcesFor(raw: RawRecord | undefined): RawRecord[] {
  if (!raw) return [];
  return [
    raw,
    asRecord(raw.service),
    asRecord(raw.details),
    asRecord(raw.metadata),
    asRecord(raw.serviceDetails),
    asRecord(raw.booking),
  ].filter(Boolean) as RawRecord[];
}

function readString(raw: RawRecord | undefined, keys: string[]): string | undefined {
  for (const source of sourcesFor(raw)) {
    for (const key of keys) {
      const value = source[key];
      if (value != null && String(value).trim().length > 0) {
        return String(value);
      }
    }
  }
  return undefined;
}

function readNumber(raw: RawRecord | undefined, keys: string[]): number | undefined {
  const value = readString(raw, keys);
  if (!value) return undefined;
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getRawList(payload: unknown): RawRecord[] {
  if (Array.isArray(payload)) return payload.filter(asRecord) as RawRecord[];
  const record = asRecord(payload);
  const data = record?.data;
  return Array.isArray(data) ? (data.filter(asRecord) as RawRecord[]) : [];
}

function getItineraryDays(payload: unknown): RawRecord[] {
  const record = asRecord(payload);
  const days = record?.days;
  return Array.isArray(days) ? (days.filter(asRecord) as RawRecord[]) : [];
}

async function fetchJourneyAssets(tripId: string): Promise<{
  bookings: RawRecord[];
  itineraryDays: RawRecord[];
}> {
  const [bookingsRes, itineraryRes] = await Promise.all([
    bookingsApi.getBookingsForTrip(tripId).catch(() => ({ data: [] })),
    itineraryApi.getItinerary(tripId).catch(() => ({ data: null })),
  ]);

  return {
    bookings: getRawList(bookingsRes.data),
    itineraryDays: getItineraryDays(itineraryRes.data),
  };
}

function normalizeTrip(raw: RawRecord): JourneyTrip {
  const view = mapTripToDetailView(raw);
  return {
    id: String(raw.id ?? raw.tripId ?? ''),
    destination: view.destination || DEMO_TRIP.destination,
    startDate: view.startDate || DEMO_TRIP.startDate,
    endDate: view.endDate || DEMO_TRIP.endDate,
    totalBudget: view.totalBudget || DEMO_TRIP.totalBudget,
    currency: view.currency || DEMO_TRIP.currency,
    status: (view.status || DEMO_TRIP.status).toUpperCase(),
  };
}

function pickJourneyTrip(trips: JourneyTrip[]): JourneyTrip {
  const selectableTrips = getSelectableJourneyTrips(trips);
  if (selectableTrips.length === 0) return DEMO_TRIP;

  return [...selectableTrips].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )[0];
}

function isSelectableJourneyTrip(trip: JourneyTrip): boolean {
  return trip.status === 'ACTIVE' || trip.status === 'CONFIRMED';
}

function getSelectableJourneyTrips(trips: JourneyTrip[]): JourneyTrip[] {
  return trips.filter(isSelectableJourneyTrip);
}

function bookingLooksLike(raw: RawRecord, type: 'flight' | 'hotel'): boolean {
  const haystack = [
    readString(raw, ['type', 'serviceType', 'category']),
    readString(raw, ['providerName', 'provider', 'name', 'airline', 'hotelName']),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (type === 'flight') return haystack.includes('flight') || haystack.includes('airline');
  return haystack.includes('hotel') || haystack.includes('accommodation') || haystack.includes('stay');
}

function formatDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatMoney(amount: number | undefined, currency: string, fallbackAmount: number): string {
  const value = amount ?? fallbackAmount;
  return `${currency} ${Math.round(value).toLocaleString()}`;
}

function countNights(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function coordinateFrom(raw: RawRecord | undefined): { latitude: number; longitude: number } | undefined {
  if (!raw) return undefined;
  const location = asRecord(raw.location);
  const coordinates = asRecord(raw.coordinates);
  const geo = asRecord(raw.geo);
  const sources = [raw, location, coordinates, geo].filter(Boolean) as RawRecord[];

  for (const source of sources) {
    const latitude = readNumber(source, ['latitude', 'lat']);
    const longitude = readNumber(source, ['longitude', 'lng', 'lon']);
    if (latitude != null && longitude != null) {
      return { latitude, longitude };
    }
  }

  return undefined;
}

function buildFlightData(trip: JourneyTrip, bookings: RawRecord[], passengerName: string): FlightTicketData {
  const flight = bookings.find((booking) => bookingLooksLike(booking, 'flight'));
  const routeParts = trip.destination.split(',').map((part) => part.trim()).filter(Boolean);
  const arrivalCity = routeParts[0] || trip.destination;
  const departureTime = readString(flight, ['departureTime', 'departure_time', 'validFrom', 'valid_from']);
  const arrivalTime = readString(flight, ['arrivalTime', 'arrival_time', 'validUntil', 'valid_until']);

  return {
    airline: readString(flight, ['airline', 'providerName', 'provider', 'name']) ?? 'Skyline Airways',
    flightNumber: readString(flight, ['flightNumber', 'flight_number', 'number']) ?? 'SK 482',
    departureAirport: readString(flight, ['departureAirport', 'departure_airport', 'fromAirport']) ?? 'CPH',
    departureCity: readString(flight, ['departureCity', 'departure_city', 'fromCity']) ?? 'Copenhagen',
    arrivalAirport: readString(flight, ['arrivalAirport', 'arrival_airport', 'toAirport']) ?? 'HND',
    arrivalCity: readString(flight, ['arrivalCity', 'arrival_city', 'toCity']) ?? arrivalCity,
    date: formatDate(readString(flight, ['date', 'validFrom', 'valid_from']) ?? trip.startDate, formatDate(trip.startDate, 'Jun 12, 2026')),
    departureTime: formatTime(departureTime, '08:45 AM'),
    arrivalTime: formatTime(arrivalTime, '11:20 AM'),
    duration: readString(flight, ['duration', 'flightDuration']) ?? '11h 35m',
    seat: readString(flight, ['seat', 'seatNumber', 'seat_number']) ?? '14A',
    gate: readString(flight, ['gate', 'gateNumber', 'gate_number']) ?? 'B12',
    bookingReference: readString(flight, ['reference', 'bookingReference', 'booking_reference', 'pnr']) ?? 'JNY48K',
    passengerName,
    ticketPrice: formatMoney(readNumber(flight, ['price', 'cost', 'amount', 'fare']), trip.currency, Math.max(280, trip.totalBudget * 0.22)),
    status: (readString(flight, ['status']) ?? 'CONFIRMED').toUpperCase(),
  };
}

function buildHotelData(trip: JourneyTrip, bookings: RawRecord[]): HotelBookingData {
  const hotel = bookings.find((booking) => bookingLooksLike(booking, 'hotel'));
  const nights = countNights(trip.startDate, trip.endDate);
  const routeParts = trip.destination.split(',').map((part) => part.trim()).filter(Boolean);
  const cityCountry = routeParts.length > 1 ? `${routeParts[0]}, ${routeParts.slice(1).join(', ')}` : trip.destination;
  const hotelCoordinate = coordinateFrom(hotel);

  return {
    imageUrl: readString(hotel, ['imageUrl', 'image_url', 'image', 'photoUrl', 'photo_url', 'hotelImage']) ?? '',
    hotelName: readString(hotel, ['hotelName', 'hotel_name', 'providerName', 'provider', 'name']) ?? 'Aoyama Grand Hotel',
    location: readString(hotel, ['location', 'address', 'cityCountry']) ?? cityCountry,
    checkIn: formatShortDate(readString(hotel, ['checkIn', 'check_in', 'validFrom', 'valid_from']) ?? trip.startDate),
    checkOut: formatShortDate(readString(hotel, ['checkOut', 'check_out', 'validUntil', 'valid_until']) ?? trip.endDate),
    nights: `${nights} ${nights === 1 ? 'night' : 'nights'}`,
    rating: readString(hotel, ['rating', 'stars']) ?? '4.8',
    price: formatMoney(readNumber(hotel, ['price', 'totalPrice', 'total_price', 'cost', 'amount']), trip.currency, Math.max(520, trip.totalBudget * 0.38)),
    status: (readString(hotel, ['status']) ?? 'CONFIRMED').toUpperCase(),
    latitude: hotelCoordinate?.latitude,
    longitude: hotelCoordinate?.longitude,
  };
}

export default function JourneyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const mode: Mode = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = theme[mode];
  const [trips, setTrips] = useState<JourneyTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<RawRecord[]>([]);
  const [itineraryDays, setItineraryDays] = useState<RawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [passengerName, setPassengerName] = useState(DEFAULT_PASSENGER_NAME);

  const selectableTrips = useMemo(() => getSelectableJourneyTrips(trips), [trips]);

  const selectedTrip = useMemo(
    () => selectableTrips.find((item) => item.id === selectedTripId) ?? null,
    [selectableTrips, selectedTripId]
  );

  const trip = selectedTrip ?? DEMO_TRIP;

  const loadJourney = useCallback(async () => {
    setNotice(null);

    try {
      const tripsRes = await tripsApi.getAll({ page: 1, limit: 50 });
      const nextTrips = getRawList(tripsRes.data)
        .map(normalizeTrip)
        .filter((item) => item.status !== 'CANCELLED');

      const nextSelectableTrips = getSelectableJourneyTrips(nextTrips);

      setTrips(nextTrips);
      setSelectedTripId((currentTripId) => {
        if (currentTripId && nextSelectableTrips.some((item) => item.id === currentTripId)) {
          return currentTripId;
        }

        const defaultTrip = pickJourneyTrip(nextSelectableTrips);
        return defaultTrip.id || null;
      });

      if (nextSelectableTrips.length === 0) {
        setNotice('Demo wallet shown until you have an active or confirmed trip.');
      }
    } catch {
      setTrips([]);
      setSelectedTripId(null);
      setBookings([]);
      setItineraryDays([]);
      setNotice('Demo wallet shown while trip data is unavailable.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  const loadPassengerName = useCallback(async () => {
    try {
      const profileRes = await userApi.getProfile();
      setPassengerName(passengerNameFromProfile(profileRes.data));
    } catch {
      setPassengerName(DEFAULT_PASSENGER_NAME);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadJourney();
      loadPassengerName();
    }, [loadJourney, loadPassengerName])
  );

  useEffect(() => {
    let cancelled = false;

    if (!trip.id) {
      setBookings([]);
      setItineraryDays([]);
      return undefined;
    }

    setBookings([]);
    setItineraryDays([]);

    fetchJourneyAssets(trip.id)
      .then((assets) => {
        if (cancelled) return;
        setBookings(assets.bookings);
        setItineraryDays(assets.itineraryDays);
      })
      .catch(() => {
        if (cancelled) return;
        setBookings([]);
        setItineraryDays([]);
      });

    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadJourney();
  }, [loadJourney]);

  const handleSelectTrip = useCallback(
    (tripId: string) => {
      if (tripId === selectedTripId) return;
      setBookings([]);
      setItineraryDays([]);
      setSelectedTripId(tripId);
    },
    [selectedTripId]
  );

  const flight = useMemo(
    () => buildFlightData(trip, bookings, passengerName),
    [trip, bookings, passengerName]
  );
  const hotel = useMemo(() => buildHotelData(trip, bookings), [trip, bookings]);
  const dateRange = formatTripDateRange(trip.startDate, trip.endDate);
  const canOpenTripPass = Boolean(trip.id);

  if (loading) {
    return <LoadingSpinner message="Loading journey wallet..." />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.glow, styles.glowTop, { backgroundColor: colors.glowA }]} />
      <View style={[styles.glow, styles.glowBottom, { backgroundColor: colors.glowB }]} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        <JourneyHeader destination={trip.destination} dateRange={dateRange} status={trip.status} mode={mode} />

        {selectableTrips.length > 0 ? (
          <ScrollView
            horizontal
            style={styles.tripSelector}
            contentContainerStyle={styles.tripSelectorContent}
            showsHorizontalScrollIndicator={false}
          >
            {selectableTrips.map((item) => {
              const isActive = item.id === selectedTripId;

              return (
                <TouchableOpacity
                  key={item.id || `${item.destination}-${item.startDate}`}
                  activeOpacity={0.86}
                  onPress={() => handleSelectTrip(item.id)}
                  style={[
                    styles.tripChip,
                    {
                      backgroundColor: isActive ? colors.accent : colors.softCard,
                      borderColor: isActive ? colors.accent : colors.border,
                      shadowColor: colors.shadow,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.tripChipDestination,
                      { color: isActive ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {item.destination}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.tripChipDate,
                      { color: isActive ? 'rgba(255,255,255,0.78)' : colors.muted },
                    ]}
                  >
                    {formatTripDateRange(item.startDate, item.endDate)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {notice ? (
          <View style={[styles.notice, { backgroundColor: colors.softCard, borderColor: colors.border }]}>
            <Feather name="info" size={15} color={colors.accent} />
            <Text style={[styles.noticeText, { color: colors.muted }]}>{notice}</Text>
          </View>
        ) : null}

        <FlightTicketCard flight={flight} mode={mode} />

        <HotelBookingCard hotel={hotel} mode={mode} />

        <TripRouteMap
          key={trip.id || trip.destination}
          itineraryDays={itineraryDays}
          mode={mode}
          destination={trip.destination}
          hotel={hotel}
        />

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={!canOpenTripPass}
          onPress={() => {
            if (trip.id) router.push({ pathname: '/qr-pass', params: { tripId: trip.id } });
          }}
          style={[
            styles.passCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.shadow,
              opacity: canOpenTripPass ? 1 : 0.72,
            },
          ]}
        >
          <View style={[styles.passIcon, { backgroundColor: colors.accentSoft }]}>
            <Feather name="maximize" size={22} color={colors.accent} />
          </View>
          <View style={styles.passCopy}>
            <Text style={[styles.passLabel, { color: colors.muted }]}>QR TRIP PASS</Text>
            <Text style={[styles.passTitle, { color: colors.text }]}>Ready for check-in</Text>
            <Text style={[styles.passMeta, { color: colors.muted }]}>
              {canOpenTripPass ? 'Tap to open your secure trip pass.' : 'Available after a real trip is loaded.'}
            </Text>
          </View>
          {refreshing ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Feather name="chevron-right" size={22} color={colors.muted} />
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    gap: 20,
    paddingBottom: 56,
    paddingHorizontal: 20,
    paddingTop: 58,
  },
  glow: {
    borderRadius: 999,
    position: 'absolute',
  },
  glowTop: {
    height: 310,
    right: -110,
    top: -90,
    width: 310,
  },
  glowBottom: {
    bottom: 140,
    height: 250,
    left: -120,
    width: 250,
  },
  tripSelector: {
    marginHorizontal: -20,
    marginTop: -8,
  },
  tripSelectorContent: {
    gap: 10,
    paddingBottom: 2,
    paddingHorizontal: 20,
  },
  tripChip: {
    borderRadius: 18,
    borderWidth: 1,
    elevation: 3,
    minWidth: 154,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  tripChipDestination: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 3,
  },
  tripChipDate: {
    fontSize: 11,
    fontWeight: '700',
  },
  notice: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  passCard: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 5,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  passIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  passCopy: { flex: 1 },
  passLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  passTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  passMeta: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  bottomSpace: { height: 28 },
});

