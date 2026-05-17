import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { api } from '@/api/client';
import { tripsApi } from '@/api/trips';
import { userApi } from '@/api/user';
import { bookingsApi } from '@/api/bookings';
import { itineraryApi, type ItineraryDayRaw } from '@/api/itinerary';
import { OfflineBanner } from '@/components/OfflineBanner';
import type { TripDetailView, BookingDetailView } from '@/types/trip';
import {
  canCancelTrip,
  canEditTrip,
  isQrPassAvailable,
  normalizeTripStatus,
} from '@/utils/tripStatus';
import { mapTripToDetailView, mapBookingToDetailView } from '@/utils/tripDetailMappers';
import { formatTripDateRange } from '@/utils/dateFormat';
import { mapCostBreakdownToView } from '@/utils/budgetBreakdown';
import type { BudgetBreakdownView } from '@/types/budget';
import { useConnectivity } from '@/hooks/useConnectivity';
import { cacheTrip, getCachedTrip, removeCachedTrip } from '@/utils/offlineCache';
import { cancelTripReminders } from '@/utils/notifications';
import { getErrorMessage } from '@/utils/errorHandler';
import { showToast } from '@/utils/toastStore';
import { getDeepLinkForTrip } from '@/utils/deepLinkHandler';
import { TripCoverImage } from '@/components/TripCoverImage';
import { UserAvatar } from '@/components/UserAvatar';
import { getResolvedProfilePhotoUrl, mapProfileToView } from '@/utils/profileMappers';
import { SHARE_FOOTER } from '@/constants/deepLinks';

type RawRecord = Record<string, unknown>;

const BG = '#F8F8F6';
const TEXT = '#111827';
const GREEN = '#10B981';
const GREY = '#6B7280';
const BLUE = '#3B82F6';

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 4,
};

type TimelineItem =
  | {
      kind: 'flight';
      time: string;
      title: string;
      subtitle: string;
      reference: string;
      status: string;
    }
  | {
      kind: 'hotel' | 'activity';
      time: string;
      title: string;
      subtitle: string;
      status: string;
    };

interface TimelineDay {
  dayNum: number;
  tabLabel: string;
  items: TimelineItem[];
}

function asRecord(value: unknown): value is RawRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function readString(raw: RawRecord, keys: string[]): string {
  for (const key of keys) {
    const v = raw[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function getTripTitle(destination: string): string {
  const city = destination.split(',')[0]?.trim();
  return city ? `${city} Explorer` : destination || 'Trip';
}

function formatShortDate(value: string, fallback: string): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime12(value: string, fallback: string): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatMoney(amount: number, currency: string): string {
  const sym =
    currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
  return `${sym}${Math.round(amount).toLocaleString()}`;
}

function getItineraryDays(payload: unknown): ItineraryDayRaw[] {
  if (!asRecord(payload)) return [];
  const days = payload.days;
  return Array.isArray(days) ? (days.filter(asRecord) as ItineraryDayRaw[]) : [];
}

function bookingKind(type: string): 'flight' | 'hotel' | 'activity' {
  const t = type.toLowerCase();
  if (t.includes('flight') || t.includes('air')) return 'flight';
  if (t.includes('hotel') || t.includes('accommodation') || t.includes('stay')) return 'hotel';
  return 'activity';
}

function dayTabLabel(startDate: string, index: number): string {
  const d = new Date(startDate);
  if (!Number.isNaN(d.getTime())) {
    d.setDate(d.getDate() + index);
    return `Day ${index + 1} • ${formatShortDate(d.toISOString(), `Day ${index + 1}`)}`;
  }
  return `Day ${index + 1}`;
}

function itemFromBooking(booking: BookingDetailView, raw: RawRecord): TimelineItem {
  const kind = bookingKind(booking.serviceType);
  const status = booking.status ? String(booking.status) : 'Confirmed';
  if (kind === 'flight') {
    const ref = booking.reference ?? booking.providerName;
    const airline = readString(raw, ['airline', 'provider']) || booking.providerName;
    const terminal = readString(raw, ['terminal', 'gate']);
    return {
      kind: 'flight',
      time: formatTime12(readString(raw, ['departureTime', 'departTime', 'validFrom']), '08:00 AM'),
      title: `Flight to ${readString(raw, ['destination', 'to']) || 'destination'}`,
      subtitle: [airline, ref, terminal].filter(Boolean).join(' • ') || ref,
      reference: ref,
      status,
    };
  }
  const time = formatTime12(readString(raw, ['checkInTime', 'startTime', 'validFrom']), '03:00 PM');
  return {
    kind,
    time,
    title:
      kind === 'hotel'
        ? `Check-in ${booking.providerName || 'Hotel'}`
        : booking.providerName || 'Activity',
    subtitle:
      kind === 'hotel'
        ? readString(raw, ['address', 'location', 'notes']) || 'Accommodation'
        : readString(raw, ['notes', 'duration']) || 'Scheduled',
    status,
  };
}

function buildTimelineFromItinerary(
  days: ItineraryDayRaw[],
  bookings: BookingDetailView[],
  rawBookings: RawRecord[],
  startDate: string,
): TimelineDay[] {
  if (days.length > 0) {
    return days.slice(0, 7).map((day, index) => {
      const items: TimelineItem[] = [];
      const flight = asRecord(day.flight);
      if (flight) {
        const ref = readString(flight, ['flightNumber', 'reference', 'airline']) || 'Flight';
        items.push({
          kind: 'flight',
          time: formatTime12(readString(flight, ['departureTime', 'departTime']), '08:00 AM'),
          title: `Flight to ${readString(flight, ['to', 'destination']) || 'destination'}`,
          subtitle: ref,
          reference: ref,
          status: 'Confirmed',
        });
      }
      const hotel = asRecord(day.hotel ?? day.accommodation);
      if (hotel) {
        items.push({
          kind: 'hotel',
          time: formatTime12(readString(hotel, ['checkInTime']), '03:00 PM'),
          title: `Check-in ${readString(hotel, ['name', 'hotelName']) || 'Hotel'}`,
          subtitle: readString(hotel, ['address', 'roomType', 'notes']) || 'Stay',
          status: 'Confirmed',
        });
      }
      const activities = Array.isArray(day.activities) ? day.activities : [];
      for (const act of activities.slice(0, 3)) {
        if (!asRecord(act)) continue;
        items.push({
          kind: 'activity',
          time: formatTime12(readString(act, ['time', 'startTime']), '10:00 AM'),
          title: readString(act, ['name', 'title']) || 'Activity',
          subtitle: readString(act, ['notes', 'duration']) || 'Scheduled',
          status: 'Confirmed',
        });
      }
      return { dayNum: index + 1, tabLabel: dayTabLabel(startDate, index), items };
    });
  }

  if (bookings.length > 0) {
    const grouped = new Map<string, { booking: BookingDetailView; raw: RawRecord }[]>();
    bookings.forEach((b, i) => {
      const raw = rawBookings[i] ?? {};
      const key = formatShortDate(b.validFrom ?? startDate, `Day ${i + 1}`);
      const list = grouped.get(key) ?? [];
      list.push({ booking: b, raw });
      grouped.set(key, list);
    });
    return Array.from(grouped.entries())
      .slice(0, 7)
      .map(([, list], index) => ({
        dayNum: index + 1,
        tabLabel: dayTabLabel(startDate, index),
        items: list.map(({ booking, raw }) => itemFromBooking(booking, raw)),
      }));
  }

  return [];
}

function countTripDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
}

interface DocTile {
  icon: keyof typeof Feather.glyphMap;
  label: string;
}

function buildDocuments(bookings: BookingDetailView[]): DocTile[] {
  const docs: DocTile[] = [];
  const seen = new Set<string>();
  for (const b of bookings) {
    const kind = bookingKind(b.serviceType);
    const key = kind === 'flight' ? 'flight' : kind === 'hotel' ? 'hotel' : 'activity';
    if (seen.has(key)) continue;
    seen.add(key);
    if (kind === 'hotel') {
      docs.push({
        icon: 'file-text',
        label: 'Hotel Booking',
      });
    } else if (kind === 'flight') {
      docs.push({
        icon: 'navigation',
        label: 'Flight Ticket',
      });
    } else {
      docs.push({
        icon: 'map-pin',
        label: 'Activity Voucher',
      });
    }
  }
  if (!seen.has('hotel')) {
    docs.push({
      icon: 'file-text',
      label: 'Hotel Booking',
    });
  }
  docs.push({
    icon: 'shield',
    label: 'Travel Insurance',
  });
  return docs.slice(0, 4);
}

export default function TripDetailScreen() {
  const router = useRouter();
  const { top, stackScrollBottomCompact: scrollBottom } = useScreenInsets();
  const { isOnline } = useConnectivity();
  const { id, tripId } = useLocalSearchParams<{ id?: string; tripId?: string }>();
  const resolvedId = tripId ?? id;
  const [trip, setTrip] = useState<TripDetailView | null>(null);
  const [bookings, setBookings] = useState<BookingDetailView[]>([]);
  const [rawBookings, setRawBookings] = useState<RawRecord[]>([]);
  const [budgetView, setBudgetView] = useState<BudgetBreakdownView | null>(null);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDayRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [userPhotoUrl, setUserPhotoUrl] = useState('');
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const profileRes = await userApi.getProfile();
      const profileRaw = (profileRes.data ?? {}) as RawRecord;
      const profileView = mapProfileToView(profileRaw);
      setUserName(profileView.name.trim() || profileView.email.split('@')[0] || 'Traveler');
      setUserPhotoUrl(getResolvedProfilePhotoUrl(profileRaw));
      const nestedUser = asRecord(profileRaw.user) ? profileRaw.user : null;
      setIsAdmin(profileRaw.isAdmin === true || nestedUser?.isAdmin === true);
    } catch {
      // keep existing avatar on profile fetch failure
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!resolvedId) return;
    setError(null);
    setLoading(true);
    try {
      const [tripRes, bookingsRes, breakdownRes, itineraryRes] = await Promise.all([
        tripsApi.getById(resolvedId),
        bookingsApi.getBookingsForTrip(resolvedId).catch(() => ({ data: [] })),
        itineraryApi.getCostBreakdown(resolvedId).catch(() => ({ data: null })),
        itineraryApi.getItinerary(resolvedId).catch(() => ({ data: null })),
      ]);
      await loadProfile();
      const tripData = tripRes.data as Record<string, unknown>;
      if (!tripData || typeof tripData !== 'object') {
        setError('Trip not found.');
        setLoading(false);
        return;
      }
      const view = mapTripToDetailView(tripData);
      setTrip(view);
      const rawList = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      setRawBookings(rawList.filter(asRecord) as RawRecord[]);
      setBookings(rawList.map((b) => mapBookingToDetailView(b as Record<string, unknown>)));

      const breakdownRaw = breakdownRes.data as Record<string, unknown> | null;
      const breakdownList = Array.isArray(breakdownRaw?.breakdown)
        ? (breakdownRaw.breakdown as Parameters<typeof mapCostBreakdownToView>[0])
        : undefined;
      setBudgetView(mapCostBreakdownToView(breakdownList, view.totalBudget, view.currency));

      setItineraryDays(getItineraryDays(itineraryRes.data));
      setSelectedDayIndex(0);

      await cacheTrip(resolvedId, { trip: tripData, bookings: rawList });
    } catch {
      if (!isOnline) {
        const cached = await getCachedTrip(resolvedId);
        const data = cached?.data as { trip?: Record<string, unknown>; bookings?: unknown[] } | undefined;
        if (data?.trip) {
          const view = mapTripToDetailView(data.trip);
          setTrip(view);
          const rawList = Array.isArray(data.bookings) ? data.bookings : [];
          setRawBookings(rawList.filter(asRecord) as RawRecord[]);
          setBookings(rawList.map((b) => mapBookingToDetailView(b as Record<string, unknown>)));
          setBudgetView(mapCostBreakdownToView(undefined, view.totalBudget, view.currency));
          setError(null);
        } else setError('Offline. No cached trip.');
      } else setError('Failed to load trip. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [resolvedId, isOnline, loadProfile]);

  useEffect(() => {
    if (!resolvedId) return;
    loadData();
  }, [resolvedId, loadData]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const handleCancel = useCallback(() => {
    if (!resolvedId || cancelling) return;
    if (!isOnline) {
      Alert.alert('Offline', 'Reconnect to the internet before cancelling this trip.');
      return;
    }
    Alert.alert('Cancel Trip', 'Are you sure you want to cancel this trip?', [
      { text: 'Keep Trip', style: 'cancel' },
      {
        text: 'Cancel Trip',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await tripsApi.update(resolvedId, { status: 'CANCELLED' });
            await cancelTripReminders(resolvedId);
            router.replace('/(tabs)');
          } catch (e: unknown) {
            setCancelling(false);
            Alert.alert('Error', getErrorMessage(e) || 'Failed to cancel trip. Please try again.');
          }
        },
      },
    ]);
  }, [cancelling, isOnline, resolvedId, router]);

  const handleDelete = useCallback(() => {
    if (!resolvedId || deleting) return;
    if (!isOnline) {
      Alert.alert('Offline', 'Reconnect to the internet before deleting this trip.');
      return;
    }
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This cannot be undone.',
      [
        { text: 'Keep Trip', style: 'cancel' },
        {
          text: 'Delete Trip',
          style: 'destructive',
          onPress: async () => {
            const tripId = resolvedId;
            setDeleting(true);
            try {
              console.log('DELETE TRIP:', tripId);
              const response = await tripsApi.delete(tripId);
              console.log('DELETE RESPONSE:', response);
              await cancelTripReminders(tripId);
              await removeCachedTrip(tripId);
              showToast('success', 'Trip deleted successfully');
              router.replace('/(tabs)');
            } catch (e: unknown) {
              const err = e as {
                code?: string;
                message?: string;
                response?: { status?: number; data?: unknown };
              };
              console.log('DELETE ERROR:', e);
              console.log('DELETE ERROR CODE:', err?.code);
              console.log('DELETE ERROR MESSAGE:', err?.message);
              console.log('DELETE RESPONSE STATUS:', err?.response?.status);
              console.log('DELETE RESPONSE DATA:', err?.response?.data);
              console.log('DELETE BASE URL:', api.defaults.baseURL);
              console.log('DELETE FULL URL:', `${api.defaults.baseURL}/trips/${tripId}`);
              console.log('DELETE TRIP ID TYPE:', typeof tripId, tripId);
              setDeleting(false);
              Alert.alert('Error', getErrorMessage(e) || 'Failed to delete trip. Please try again.');
            }
          },
        },
      ],
    );
  }, [deleting, isOnline, resolvedId, router]);

  const handleShare = useCallback(async () => {
    if (!trip || !resolvedId) return;
    const deepLink = getDeepLinkForTrip(resolvedId);
    const message = [
      `🌍 My trip to ${trip.destination}`,
      `📅 ${formatTripDateRange(trip.startDate, trip.endDate)}`,
      `💰 Budget: ${trip.currency} ${trip.totalBudget.toLocaleString()}`,
      `🔗 ${deepLink}`,
      SHARE_FOOTER,
    ].join('\n');
    try {
      await Share.share({ message });
    } catch {
      // ignore
    }
  }, [trip, resolvedId]);

  const timeline = useMemo(() => {
    if (!trip) return [];
    return buildTimelineFromItinerary(itineraryDays, bookings, rawBookings, trip.startDate);
  }, [bookings, itineraryDays, rawBookings, trip]);

  const documents = useMemo(() => buildDocuments(bookings), [bookings]);

  const activeDay = timeline[selectedDayIndex] ?? timeline[0];
  const activeItems = activeDay?.items ?? [];

  if (!resolvedId) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: top }]}>
        <Text style={styles.notFoundText}>Trip not found.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: top }]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading trip...</Text>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: top }]}>
        <Text style={styles.errorText}>{error ?? 'Trip not found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showQr = isQrPassAvailable(trip.status);
  const tripStatus = normalizeTripStatus(trip.status);
  const isActive = tripStatus === 'ACTIVE';
  const isCancellable = canCancelTrip(tripStatus);
  const canDelete =
    tripStatus === 'COMPLETED' || tripStatus === 'CANCELLED' || isAdmin;
  const showTripActions = isCancellable || canDelete;
  const canEdit = canEditTrip(trip.status ?? '');
  const datesFormatted = formatTripDateRange(trip.startDate, trip.endDate);
  const tripDays = countTripDays(trip.startDate, trip.endDate);
  const currency = trip.currency;
  const spent = budgetView?.totalAllocated ?? 0;
  const total = budgetView?.totalBudget ?? trip.totalBudget;

  const renderTimelineCard = (item: TimelineItem, index: number) => {
    const isFlight = item.kind === 'flight';
    const dotColor = isFlight ? GREEN : item.kind === 'hotel' ? BLUE : GREY;
    const icon: keyof typeof Feather.glyphMap = isFlight
      ? 'navigation'
      : item.kind === 'hotel'
        ? 'home'
        : 'map-pin';

    return (
      <View key={`${item.kind}-${index}`} style={styles.timelineItem}>
        <View style={[styles.timelineDot, { backgroundColor: dotColor }]}>
          <Feather name={icon} size={10} color="#fff" />
        </View>
        <View style={[styles.timelineCard, CARD_SHADOW]}>
          <View style={styles.timelineCardTop}>
            <View style={styles.timelineCardLeft}>
              <Text style={styles.timelineTime}>{item.time}</Text>
              <Text style={styles.timelineTitle}>{item.title}</Text>
            </View>
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedText}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.timelineSubtitle}>{item.subtitle}</Text>
          {isFlight && showQr ? (
            <TouchableOpacity
              style={styles.boardingBtn}
              onPress={() => router.push({ pathname: '/qr-pass', params: { tripId: resolvedId } })}
              activeOpacity={0.85}
            >
              <Text style={styles.boardingBtnText}>Boarding Pass</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Feather name="arrow-left" size={16} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Hub</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.85}
            accessibilityLabel="Open profile"
          >
            <UserAvatar photoUrl={userPhotoUrl || null} name={userName} size={36} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleShare} activeOpacity={0.85}>
            <Feather name="share-2" size={16} color={TEXT} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <OfflineBanner visible={!isOnline} />

        <View style={[styles.summaryCard, CARD_SHADOW]}>
          <View style={styles.heroWrap}>
            <TripCoverImage
              destination={trip.destination}
              containerStyle={StyleSheet.absoluteFillObject}
            />
            <View style={styles.heroGradient} />
            <View style={styles.heroOverlay}>
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroTitle}>{getTripTitle(trip.destination)}</Text>
                <Text style={styles.heroDates}>
                  {datesFormatted} • {tripDays} Days
                </Text>
              </View>
              {canEdit ? (
                <TouchableOpacity
                  style={styles.editTripBtn}
                  onPress={() =>
                    router.push({ pathname: '/edit-itinerary', params: { tripId: resolvedId } })
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.editTripText}>Edit Trip</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.summaryFooter}>
            <View>
              <Text style={styles.summaryLabel}>Travelers</Text>
              <View style={styles.travelerRow}>
                <View style={[styles.travelerAvatar, styles.travelerAvatar1]}>
                  <UserAvatar photoUrl={userPhotoUrl || null} name={userName} size={28} />
                </View>
                <TouchableOpacity
                  style={styles.travelerAdd}
                  onPress={() =>
                    Alert.alert('Travelers', 'Inviting travel companions is coming soon.')
                  }
                  activeOpacity={0.85}
                  accessibilityLabel="Add traveler"
                >
                  <Feather name="plus" size={10} color={GREEN} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.budgetBlock}
              onPress={() => router.push({ pathname: '/budget-breakdown', params: { tripId: resolvedId } })}
              activeOpacity={0.85}
            >
              <Text style={styles.summaryLabel}>Total Budget</Text>
              <Text style={styles.budgetMain}>{formatMoney(spent, currency)}</Text>
              <Text style={styles.budgetSub}>of {formatMoney(total, currency)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showQr ? (
          <View style={styles.qrBanner}>
            <View style={styles.qrBannerGlow} />
            <View style={styles.qrBannerText}>
              <Text style={styles.qrBannerTitle}>Digital Pass Ready</Text>
              <Text style={styles.qrBannerSub}>All your reservations in one QR</Text>
            </View>
            <TouchableOpacity
              style={styles.qrBannerBtn}
              onPress={() => router.push({ pathname: '/qr-pass', params: { tripId: resolvedId } })}
              activeOpacity={0.9}
            >
              <Feather name="grid" size={14} color="#fff" />
              <Text style={styles.qrBannerBtnText}>View Pass</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(trip.status?.toUpperCase() ?? '') ? (
          <TouchableOpacity
            style={styles.trackLiveRow}
            onPress={() => router.push({ pathname: '/active-trip', params: { tripId: resolvedId } })}
            activeOpacity={0.85}
          >
            <Feather name="navigation" size={14} color={GREEN} />
            <Text style={styles.trackLiveText}>Track live trip</Text>
            <Feather name="chevron-right" size={14} color={GREY} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Itinerary</Text>
            <View style={styles.sectionLinks}>
              {canEdit ? (
                <TouchableOpacity
                  onPress={() =>
                    router.push({ pathname: '/edit-itinerary', params: { tripId: resolvedId } })
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionLink}>Edit</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: '/itinerary-review', params: { tripId: resolvedId } })
                }
                activeOpacity={0.7}
              >
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
          </View>

          {timeline.length === 0 ? (
            <View style={[styles.emptyCard, CARD_SHADOW]}>
              <Feather name="calendar" size={28} color={GREY} />
              <Text style={styles.emptyText}>
                No itinerary yet. Bookings will appear here once confirmed.
              </Text>
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayTabs}
              >
                {timeline.map((day, index) => (
                  <TouchableOpacity
                    key={day.dayNum}
                    style={[styles.dayTab, selectedDayIndex === index && styles.dayTabActive]}
                    onPress={() => setSelectedDayIndex(index)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[styles.dayTabText, selectedDayIndex === index && styles.dayTabTextActive]}
                    >
                      {day.tabLabel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.timeline}>
                <View style={styles.timelineLine} />
                {activeItems.length === 0 ? (
                  <Text style={styles.emptyDayText}>Nothing scheduled for this day.</Text>
                ) : (
                  activeItems.map(renderTimelineCard)
                )}
              </View>

              <TouchableOpacity
                style={styles.fullItineraryBtn}
                onPress={() => router.push({ pathname: '/itinerary-review', params: { tripId: resolvedId } })}
                activeOpacity={0.88}
              >
                <Text style={styles.fullItineraryText}>View Full {tripDays}-Day Itinerary</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <View style={styles.docGrid}>
            {documents.map((doc) => (
              <TouchableOpacity
                key={doc.label}
                style={[styles.docTile, CARD_SHADOW]}
                onPress={() => Alert.alert(doc.label, 'Document preview is coming soon.')}
                activeOpacity={0.88}
              >
                <View style={styles.docIconArea}>
                  <Feather name={doc.icon} size={22} color={GREEN} />
                </View>
                <Text style={styles.docLabel}>{doc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {showTripActions ? (
          <View style={[styles.dangerZone, CARD_SHADOW]}>
            <Text style={styles.dangerTitle}>Trip actions</Text>
            {isCancellable ? (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
                disabled={cancelling || deleting}
                activeOpacity={0.8}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Feather name="x-circle" size={16} color="#EF4444" />
                    <Text style={styles.cancelBtnText}>
                      {cancelling ? 'Cancelling...' : 'Cancel Trip'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
            {isCancellable && canDelete ? <View style={styles.dangerDivider} /> : null}
            {canDelete ? (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={deleting || cancelling}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Feather name="trash-2" size={16} color="#EF4444" />
                    <Text style={styles.deleteBtnText}>
                      {deleting ? 'Deleting...' : 'Delete Trip'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8, gap: 32 },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  notFoundText: { color: TEXT, fontSize: 18 },
  loadingText: { color: GREY, marginTop: 16, fontSize: 14 },
  errorText: { color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: GREEN, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 20 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backLink: { color: GREY, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
    backgroundColor: BG,
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT, flex: 1, textAlign: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  heroWrap: { height: 160, position: 'relative', backgroundColor: '#E5E7EB', overflow: 'hidden' },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroTextBlock: { flex: 1, marginRight: 8 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  heroDates: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.8)' },
  editTripBtn: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editTripText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  travelerRow: { flexDirection: 'row', alignItems: 'center' },
  travelerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelerAvatar1: { marginRight: -8, zIndex: 1 },
  travelerAdd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  budgetBlock: { alignItems: 'flex-end' },
  budgetMain: { fontSize: 18, fontWeight: '700', color: TEXT },
  budgetSub: { fontSize: 10, color: GREY, marginTop: 2 },
  qrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  qrBannerGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  qrBannerText: { flex: 1, zIndex: 1 },
  qrBannerTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 4 },
  qrBannerSub: { fontSize: 10, color: GREY },
  qrBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    zIndex: 1,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  qrBannerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  trackLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  trackLiveText: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT },
  section: { gap: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  sectionLinks: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sectionLink: { fontSize: 12, fontWeight: '700', color: GREEN },
  dayTabs: { gap: 8, paddingBottom: 4 },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  dayTabActive: {
    backgroundColor: TEXT,
    borderColor: TEXT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  dayTabText: { fontSize: 12, fontWeight: '500', color: TEXT },
  dayTabTextActive: { color: '#fff', fontWeight: '700' },
  timeline: { position: 'relative', paddingLeft: 16, marginTop: 8, gap: 24 },
  timelineLine: {
    position: 'absolute',
    left: 23,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: '#F3F4F6',
  },
  timelineItem: { position: 'relative', paddingLeft: 32 },
  timelineDot: {
    position: 'absolute',
    left: -5,
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: BG,
    zIndex: 2,
  },
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  timelineCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  timelineCardLeft: { flex: 1 },
  timelineTime: {
    fontSize: 10,
    fontWeight: '700',
    color: GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timelineTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginTop: 2 },
  confirmedBadge: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confirmedText: { fontSize: 10, fontWeight: '700', color: GREEN },
  timelineSubtitle: { fontSize: 12, color: GREY, marginBottom: 12 },
  boardingBtn: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  boardingBtnText: { fontSize: 10, fontWeight: '700', color: TEXT },
  emptyDayText: { fontSize: 13, color: GREY, paddingLeft: 32, fontStyle: 'italic' },
  fullItineraryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  fullItineraryText: { fontSize: 14, fontWeight: '600', color: TEXT },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { color: GREY, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  docTile: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F9FAFB',
    position: 'relative',
  },
  docIconArea: {
    width: '100%',
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  docLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  dangerZone: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  dangerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  dangerDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  cancelBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 15 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  deleteBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
