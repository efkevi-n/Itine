import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { TripRouteMap } from '@/components/journey/TripRouteMap';
import { LiveStopCard } from '@/components/live-trip/LiveStopCard';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useLiveTripTracker } from '@/hooks/useLiveTripTracker';
import { formatTripDateRange } from '@/utils/dateFormat';
import { formatCountdown, msUntilService } from '@/utils/activeTrip';
import { isQrPassAvailable } from '@/utils/tripStatus';
import { TripCoverImage } from '@/components/TripCoverImage';
import { COUNTDOWN_UPDATE_MS } from '@/constants/activeTrip';

const BG = '#F8F8F6';
const TEXT = '#111827';
const GREEN = '#10B981';
const GREY = '#6B7280';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 4,
};

function formatMoney(amount: number, currency: string): string {
  const sym =
    currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
  return `${sym}${Math.round(amount).toLocaleString()}`;
}

function getTripTitle(destination: string): string {
  const city = destination.split(',')[0]?.trim();
  return city ? `${city} Explorer` : destination || 'Trip';
}

function countTripDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
}

export default function ActiveTripScreen() {
  const router = useRouter();
  const { top, stackScrollBottomCompact: scrollBottom } = useScreenInsets();
  const { isOnline } = useConnectivity();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const resolvedId = typeof tripId === 'string' ? tripId : undefined;

  const { tracker, dayInfo, nextService, loading, error, loadData } =
    useLiveTripTracker(resolvedId);

  const [countdown, setCountdown] = useState('');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!resolvedId) router.replace('/(tabs)');
  }, [resolvedId, router]);

  useEffect(() => {
    if (dayInfo) setSelectedDayIndex(dayInfo.dayIndex);
  }, [dayInfo]);

  useEffect(() => {
    const tick = () => {
      const ms = nextService ? msUntilService(nextService.validFrom) : 0;
      setCountdown(ms > 0 ? formatCountdown(ms) : 'In progress');
    };
    tick();
    intervalRef.current = setInterval(tick, COUNTDOWN_UPDATE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [nextService]);

  if (!resolvedId) return null;

  if (loading && !tracker) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: top }]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading live trip...</Text>
      </View>
    );
  }

  if (error && !tracker) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: top }]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!tracker) return null;

  const { trip, days, itineraryDays, budgetView, hotel } = tracker;
  const datesFormatted = formatTripDateRange(trip.startDate, trip.endDate);
  const tripDays = countTripDays(trip.startDate, trip.endDate);
  const showQr = isQrPassAvailable(trip.status);
  const spent = budgetView?.totalAllocated ?? 0;
  const total = budgetView?.totalBudget ?? trip.totalBudget;
  const progress = total > 0 ? Math.min(1, spent / total) : 0;

  const activeDay = days[selectedDayIndex] ?? days[0];
  const activeStops = activeDay?.stops ?? [];
  const nextStopId = nextService
    ? days.flatMap((d) => d.stops).find((s) => s.title.includes(nextService.providerName))?.id
    : undefined;

  const countdownLabel = nextService
    ? countdown === 'In progress'
      ? 'Happening now'
      : `Starts in ${countdown}`
    : 'No upcoming stops today';

  const budgetCategories = budgetView?.categories ?? [];
  const categoryIcons: Record<string, keyof typeof Feather.glyphMap> = {
    flights: 'navigation',
    accommodation: 'home',
    transport: 'truck',
    activities: 'tag',
    food: 'coffee',
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Feather name="arrow-left" size={16} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracker</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={loadData} activeOpacity={0.85}>
          <Feather name="refresh-cw" size={16} color={TEXT} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={GREEN} />}
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
                <View style={styles.liveRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
                <Text style={styles.heroTitle}>{getTripTitle(trip.destination)}</Text>
                <Text style={styles.heroDates}>
                  {datesFormatted} • {tripDays} Days
                </Text>
              </View>
              {dayInfo ? (
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>
                    Day {dayInfo.dayIndex + 1}/{dayInfo.totalDays}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.summaryFooter}>
            <View style={styles.liveStatusBlock}>
              <Text style={styles.summaryLabel}>Next stop</Text>
              <Text style={styles.liveCountdown}>{countdownLabel}</Text>
              {nextService ? (
                <Text style={styles.liveNext} numberOfLines={2}>
                  {nextService.providerName}
                  {nextService.reference ? ` · ${nextService.reference}` : ''}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.budgetBlock}
              onPress={() =>
                router.push({ pathname: '/budget-breakdown', params: { tripId: resolvedId } })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.summaryLabel}>Total Budget</Text>
              <Text style={styles.budgetMain}>{formatMoney(spent, trip.currency)}</Text>
              <Text style={styles.budgetSub}>of {formatMoney(total, trip.currency)}</Text>
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Route Map</Text>
            <Text style={styles.sectionMeta}>{trip.destination}</Text>
          </View>
          <TripRouteMap
            itineraryDays={itineraryDays}
            mode="light"
            destination={trip.destination}
            hotel={hotel}
            variant="itine"
            embedded
          />
        </View>

        {budgetCategories.length > 0 ? (
          <View style={[styles.budgetCard, CARD_SHADOW]}>
            <View style={styles.budgetCardTop}>
              <Text style={styles.sectionTitle}>Budget Summary</Text>
              <Text style={styles.budgetAmount}>
                <Text style={styles.budgetSpent}>{formatMoney(spent, trip.currency)}</Text>
                <Text style={styles.budgetTotal}> / {formatMoney(total, trip.currency)}</Text>
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <View style={styles.budgetGrid}>
              {budgetCategories.slice(0, 4).map((cat) => (
                <View key={cat.key} style={styles.budgetGridItem}>
                  <View style={styles.budgetIconWrap}>
                    <Feather
                      name={categoryIcons[cat.key] ?? 'tag'}
                      size={14}
                      color={GREEN}
                    />
                  </View>
                  <Text style={styles.budgetCatLabel}>{cat.label}</Text>
                  <Text style={styles.budgetCatValue}>
                    {formatMoney(cat.allocated, trip.currency)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Itinerary</Text>
            <TouchableOpacity
              onPress={() =>
                router.push({ pathname: '/itinerary-review', params: { tripId: resolvedId } })
              }
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {days.length === 0 ? (
            <View style={[styles.emptyCard, CARD_SHADOW]}>
              <Feather name="calendar" size={28} color={GREY} />
              <Text style={styles.emptyText}>No itinerary stops yet for this trip.</Text>
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayTabs}
              >
                {days.map((day, index) => (
                  <TouchableOpacity
                    key={day.dayIndex}
                    style={[styles.dayTab, selectedDayIndex === index && styles.dayTabActive]}
                    onPress={() => setSelectedDayIndex(index)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.dayTabText,
                        selectedDayIndex === index && styles.dayTabTextActive,
                      ]}
                    >
                      {day.label} • {day.dateLabel.split(',')[0]?.trim() || day.dateLabel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {activeDay ? (
                <Text style={styles.daySectionTitle}>
                  {activeDay.title}
                  {activeDay.dayTotal ? ` · ${activeDay.dayTotal}` : ''}
                </Text>
              ) : null}

              <View style={styles.timeline}>
                <View style={styles.timelineLine} />
                {activeStops.length === 0 ? (
                  <Text style={styles.emptyDayText}>Nothing scheduled for this day.</Text>
                ) : (
                  activeStops.map((stop) => (
                    <LiveStopCard
                      key={stop.id}
                      stop={stop}
                      isNext={stop.id === nextStopId}
                      showQrPass={showQr}
                      onQrPass={() =>
                        router.push({ pathname: '/qr-pass', params: { tripId: resolvedId } })
                      }
                    />
                  ))
                )}
              </View>

              <TouchableOpacity
                style={styles.fullItineraryBtn}
                onPress={() =>
                  router.push({ pathname: '/trip-detail', params: { tripId: resolvedId } })
                }
                activeOpacity={0.88}
              >
                <Text style={styles.fullItineraryText}>Back to Trip Hub</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8, gap: 32 },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: GREY, marginTop: 16, fontSize: 14 },
  errorText: { color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: GREEN,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 12,
  },
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
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
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: GREEN,
    letterSpacing: 1,
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  heroDates: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  dayBadge: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dayBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#fff',
    gap: 16,
  },
  liveStatusBlock: { flex: 1 },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  liveCountdown: { fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 4 },
  liveNext: { fontSize: 12, color: GREY, lineHeight: 18 },
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
  section: { gap: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  sectionLink: { fontSize: 12, fontWeight: '700', color: GREEN },
  sectionMeta: { fontSize: 12, color: GREY, fontWeight: '500' },
  budgetCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  budgetCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetAmount: { textAlign: 'right' },
  budgetSpent: { fontSize: 14, fontWeight: '700', color: GREEN },
  budgetTotal: { fontSize: 12, fontWeight: '400', color: GREY },
  progressTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: { height: '100%', backgroundColor: GREEN, borderRadius: 999 },
  budgetGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetGridItem: { flex: 1, alignItems: 'center' },
  budgetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  budgetCatLabel: { fontSize: 10, fontWeight: '500', color: GREY, marginBottom: 2 },
  budgetCatValue: { fontSize: 12, fontWeight: '700', color: TEXT },
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
  daySectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: GREY,
    marginBottom: 4,
  },
  timeline: { position: 'relative', paddingLeft: 16, marginTop: 8, gap: 24 },
  timelineLine: {
    position: 'absolute',
    left: 23,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: '#F3F4F6',
  },
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
});
