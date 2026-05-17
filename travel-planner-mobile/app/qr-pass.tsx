import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { trippassApi } from '@/api/trippass';
import { userApi } from '@/api/user';
import { tripsApi } from '@/api/trips';
import { formatTripDateRange } from '@/utils/dateFormat';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { OFFLINE_MESSAGES } from '@/constants/offline';
import { BiometricGate } from '@/components/BiometricGate';
import { showToast } from '@/utils/toastStore';

const QR_REFRESH_INTERVAL = 30;
const PASS_CACHE_PREFIX = 'trippass_';

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

interface CachedPass {
  jti: string;
  otp: string;
  tripId: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  userName?: string;
  savedAt: number;
}

function getCacheKey(tripId: string): string {
  return `${PASS_CACHE_PREFIX}${tripId}`;
}

function getTripTitle(destination: string): string {
  const city = destination.split(',')[0]?.trim();
  return city ? `${city} Explorer` : destination || 'Your Trip';
}

export default function QRPassScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isOnline } = useConnectivity();
  const { tripId, jti: paramJti } = useLocalSearchParams<{ tripId?: string; jti?: string }>();
  const { lockState, unlock, isLocked, resetLockTimer } = useBiometricLock();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(QR_REFRESH_INTERVAL);
  const [jti, setJti] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [resolvedTripId, setResolvedTripId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [offlineMode, setOfflineMode] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadedByJtiRef = useRef(false);

  const currentTripId = (typeof tripId === 'string' ? tripId : undefined) ?? resolvedTripId ?? undefined;

  const savePassToStorage = useCallback(
    async (data: CachedPass) => {
      if (!currentTripId) return;
      try {
        await SecureStore.setItemAsync(getCacheKey(currentTripId), JSON.stringify(data));
      } catch {
        // ignore
      }
    },
    [currentTripId],
  );

  const loadPassFromStorage = useCallback(async (): Promise<CachedPass | null> => {
    if (!currentTripId) return null;
    try {
      const raw = await SecureStore.getItemAsync(getCacheKey(currentTripId));
      if (!raw) return null;
      const data = JSON.parse(raw) as CachedPass;
      return data.savedAt ? data : null;
    } catch {
      return null;
    }
  }, [currentTripId]);

  const fetchOtp = useCallback(async (passJti: string): Promise<string | null> => {
    const res = await trippassApi.getOtp(passJti);
    const body = res.data as Record<string, unknown> | undefined;
    const newOtp = typeof body?.otp === 'string' ? body.otp : null;
    if (newOtp != null) setOtp(newOtp);
    return newOtp;
  }, []);

  const loadData = useCallback(async () => {
    if (!currentTripId) return;
    setLoadError(null);
    setLoading(true);
    setOfflineMode(false);
    try {
      const generateRes = await trippassApi.generate(currentTripId);
      const body = generateRes.data as Record<string, unknown> | undefined;
      const rawJti =
        (typeof body?.jti === 'string' ? body.jti : undefined) ??
        (body?.data && typeof (body.data as Record<string, unknown>)?.jti === 'string'
          ? ((body.data as Record<string, unknown>).jti as string)
          : undefined);
      const passJti: string = typeof rawJti === 'string' ? rawJti : '';
      if (!passJti) {
        setLoadError('Could not create trip pass.');
        setLoading(false);
        return;
      }
      setJti(passJti);

      const [otpRes, profileRes, tripRes] = await Promise.all([
        trippassApi.getOtp(passJti),
        userApi.getProfile().catch(() => ({ data: null })),
        tripsApi.getById(currentTripId).catch(() => ({ data: null })),
      ]);
      const otpBody = otpRes.data as Record<string, unknown> | undefined;
      const newOtp = typeof otpBody?.otp === 'string' ? otpBody.otp : null;
      setOtp(newOtp);

      const profile = profileRes.data as { name?: string } | null;
      if (profile) {
        setUserName(typeof profile.name === 'string' ? profile.name : '');
      }

      const trip = tripRes.data as {
        destination?: string;
        startDate?: string;
        endDate?: string;
        start_date?: string;
        end_date?: string;
      } | null;
      if (trip) {
        setDestination(trip.destination ?? '');
        setStartDate(trip.startDate ?? trip.start_date ?? '');
        setEndDate(trip.endDate ?? trip.end_date ?? '');
      }

      await savePassToStorage({
        jti: passJti,
        otp: newOtp ?? '',
        tripId: currentTripId,
        destination: trip?.destination ?? '',
        startDate: trip?.startDate ?? trip?.start_date ?? '',
        endDate: trip?.endDate ?? trip?.end_date ?? '',
        userName: typeof profile?.name === 'string' ? profile.name : '',
        savedAt: Date.now(),
      });
    } catch {
      const cached = await loadPassFromStorage();
      if (cached) {
        setJti(cached.jti);
        setOtp(cached.otp || null);
        setUserName(cached.userName ?? '');
        setDestination(cached.destination ?? '');
        setStartDate(cached.startDate ?? '');
        setEndDate(cached.endDate ?? '');
        setOfflineMode(true);
        setLoadError(null);
      } else {
        setLoadError('Could not load pass. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentTripId, savePassToStorage, loadPassFromStorage]);

  const loadDataByJti = useCallback(async () => {
    const passJti = typeof paramJti === 'string' ? paramJti : '';
    if (!passJti) return;
    setLoadError(null);
    setLoading(true);
    setOfflineMode(false);
    try {
      const [passRes, otpRes] = await Promise.all([
        trippassApi.getTripPass(passJti),
        trippassApi.getOtp(passJti),
      ]);
      const passBody = passRes.data as Record<string, unknown> | undefined;
      const tripIdFromPass = passBody?.tripId != null ? String(passBody.tripId) : null;
      const otpBody = otpRes.data as Record<string, unknown> | undefined;
      const newOtp = typeof otpBody?.otp === 'string' ? otpBody.otp : null;
      setJti(passJti);
      setOtp(newOtp);
      if (tripIdFromPass) setResolvedTripId(tripIdFromPass);
      if (tripIdFromPass) {
        const [profileRes, tripRes] = await Promise.all([
          userApi.getProfile().catch(() => ({ data: null })),
          tripsApi.getById(tripIdFromPass).catch(() => ({ data: null })),
        ]);
        const profile = profileRes.data as { name?: string } | null;
        if (profile) setUserName(typeof profile.name === 'string' ? profile.name : '');
        const trip = tripRes.data as {
          destination?: string;
          startDate?: string;
          endDate?: string;
          start_date?: string;
          end_date?: string;
        } | null;
        if (trip) {
          setDestination(trip.destination ?? '');
          setStartDate(trip.startDate ?? trip.start_date ?? '');
          setEndDate(trip.endDate ?? trip.end_date ?? '');
        }
      }
    } catch {
      setLoadError('Could not load pass. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [paramJti]);

  useEffect(() => {
    if (paramJti && !tripId) {
      if (!loadedByJtiRef.current) {
        loadedByJtiRef.current = true;
        loadDataByJti();
      }
      return;
    }
    if (!currentTripId) {
      router.replace('/(tabs)');
      return;
    }
    loadData();
  }, [currentTripId, tripId, paramJti, router, loadData, loadDataByJti]);

  const refreshOtp = useCallback(async () => {
    if (!jti || !isOnline) return;
    try {
      const newOtp = await fetchOtp(jti);
      if (newOtp && currentTripId) {
        const cached = await loadPassFromStorage();
        if (cached) {
          await savePassToStorage({ ...cached, otp: newOtp, savedAt: Date.now() });
        }
      }
    } catch {
      // keep current OTP
    }
    setCountdown(QR_REFRESH_INTERVAL);
  }, [jti, currentTripId, isOnline, fetchOtp, loadPassFromStorage, savePassToStorage]);

  useEffect(() => {
    if (!jti || !isOnline || isLocked) return;
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshOtp();
          return QR_REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [jti, isOnline, isLocked, refreshOtp]);

  useFocusEffect(
    useCallback(() => {
      if (isLocked && jti) unlock();
    }, [isLocked, jti, unlock]),
  );

  const handleSaveOffline = useCallback(async () => {
    if (!jti || !currentTripId) return;
    await savePassToStorage({
      jti,
      otp: otp ?? '',
      tripId: currentTripId,
      destination,
      startDate,
      endDate,
      userName,
      savedAt: Date.now(),
    });
    showToast('success', 'Pass saved for offline use.');
  }, [jti, currentTripId, destination, startDate, endDate, userName, otp, savePassToStorage]);

  const handleMenuPress = useCallback(() => {
    Alert.alert('Digital Pass', undefined, [
      { text: 'Refresh code', onPress: () => refreshOtp() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [refreshOtp]);

  const qrPayload =
    jti != null && otp != null && currentTripId
      ? JSON.stringify({ jti, otp, tripId: currentTripId })
      : '';

  const datesFormatted = startDate && endDate ? formatTripDateRange(startDate, endDate) : '';
  const tripTitle = getTripTitle(destination);
  const cityLabel = destination.split(',')[0]?.trim() || destination;

  if (!currentTripId && !paramJti) {
    return null;
  }

  if (loading && !jti) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading your pass...</Text>
      </View>
    );
  }

  if (loadError && !offlineMode) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <View style={styles.errorIconWrap}>
          <Feather name="alert-circle" size={32} color={GREEN} />
        </View>
        <Text style={styles.authTitle}>Unable to Load Pass</Text>
        <Text style={styles.authSubtitle}>{loadError}</Text>
        <TouchableOpacity style={styles.authBtn} onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          loadData();
        }}>
          <Text style={styles.authBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        }} style={styles.backLinkBtn}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Feather name="arrow-left" size={16} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Digital Pass</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleMenuPress} activeOpacity={0.85}>
          <Feather name="more-vertical" size={16} color={TEXT} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        onScroll={resetLockTimer}
        scrollEventThrottle={16}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity style={styles.backBtn} onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}>
            <Feather name="chevron-left" size={18} color="#6366f1" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.eyebrow}>QR PASS</Text>
          <Text style={styles.title}>Your QR Pass</Text>
          <Text style={styles.subtitle}>Show this at check-in points</Text>
          <View style={styles.divider} />

          <View style={styles.passCard}>
            <View style={styles.passTop}>
              <View style={styles.passTopGlow} />
              <Text style={styles.passTitle}>{tripTitle}</Text>
              <Text style={styles.passSubtitle}>{datesFormatted}</Text>
              <View style={styles.qrWrap}>
                <View style={styles.qrFrame}>
                  {qrPayload ? (
                    <QRCode value={qrPayload} size={180} color="#111827" backgroundColor="#fff" />
                  ) : (
                    <ActivityIndicator size="large" color={GREEN} />
                  )}
                </View>
              </View>
              <View style={styles.activePassBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activePassText}>Active Pass</Text>
              </View>
              {isOnline && !isLocked ? (
                <Text style={styles.refreshHint}>Refreshes in {countdown}s</Text>
              ) : null}
            </View>

          <View style={styles.ticketDivider}>
            <View style={styles.ticketNotchLeft} />
            <View style={styles.ticketDash} />
            <View style={styles.ticketNotchRight} />
          </View>

          <View style={styles.passBottom}>
            <View style={styles.detailCard}>
              <View style={styles.detailLeft}>
                <View style={[styles.detailIcon, styles.detailIconGreen]}>
                  <Feather name="navigation" size={14} color={GREEN} />
                </View>
                <View>
                  <Text style={styles.detailLabel}>Flight • {cityLabel}</Text>
                  <Text style={styles.detailValue}>Show at check-in • Gate info in app</Text>
                </View>
              </View>
              <View style={styles.onTimeBadge}>
                <Text style={styles.onTimeText}>On Time</Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailLeft}>
                <View style={[styles.detailIcon, styles.detailIconBlue]}>
                  <Feather name="home" size={14} color="#3B82F6" />
                </View>
                <View>
                  <Text style={styles.detailLabel}>Hotel • {cityLabel}</Text>
                  <Text style={styles.detailValue}>Check-in details in itinerary</Text>
                </View>
              </View>
            </View>

            <Text style={styles.scanHint}>Scan this QR code at any partnered service.</Text>
          </View>
          </View>
        </Animated.View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.actionCard, CARD_SHADOW]} onPress={handleSaveOffline} activeOpacity={0.88}>
            <View style={styles.actionIconGreen}>
              <Feather name="download" size={18} color={GREEN} />
            </View>
            <Text style={styles.actionLabel}>Save Offline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, CARD_SHADOW]}
            onPress={() => Alert.alert('Add to Wallet', 'Apple Wallet integration is coming soon.')}
            activeOpacity={0.88}
          >
            <View style={styles.actionIconDark}>
              <Feather name="smartphone" size={18} color="#fff" />
            </View>
            <Text style={styles.actionLabel}>Add to Wallet</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.hintsCard, CARD_SHADOW]}>
          <Text style={styles.hintsTitle}>How to use your pass</Text>
          <View style={styles.hintRow}>
            <View style={styles.hintNumber}>
              <Text style={styles.hintNumberText}>1</Text>
            </View>
            <Text style={styles.hintText}>
              Present this QR code at airport security, hotel front desk, or transport gates.
            </Text>
          </View>
          <View style={styles.hintRow}>
            <View style={styles.hintNumber}>
              <Text style={styles.hintNumberText}>2</Text>
            </View>
            <Text style={styles.hintText}>
              Ensure your screen brightness is turned up for easy scanning.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, gap: 24 },
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 4,
  },
  offlineBannerText: { flex: 1, color: '#D97706', fontSize: 12, fontWeight: '600' },
  passCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  passTop: {
    paddingTop: 32,
    paddingHorizontal: 32,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  passTopGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  passTitle: { fontSize: 22, fontWeight: '700', color: TEXT, marginBottom: 4, zIndex: 1 },
  passSubtitle: { fontSize: 14, color: GREY, marginBottom: 24, zIndex: 1, textAlign: 'center' },
  qrWrap: { zIndex: 1, marginBottom: 16 },
  qrFrame: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.1)',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  activePassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    zIndex: 1,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  activePassText: { fontSize: 12, fontWeight: '700', color: GREEN },
  refreshHint: { fontSize: 11, color: GREY, marginTop: 8, zIndex: 1 },
  ticketDivider: {
    height: 32,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ticketNotchLeft: {
    position: 'absolute',
    left: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BG,
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  ticketNotchRight: {
    position: 'absolute',
    right: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BG,
    borderLeftWidth: 1,
    borderLeftColor: '#F3F4F6',
  },
  ticketDash: {
    flex: 1,
    height: 1,
    marginHorizontal: 32,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passBottom: {
    backgroundColor: '#FAFAFA',
    padding: 24,
    gap: 12,
  },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconGreen: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  detailIconBlue: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  detailValue: { fontSize: 14, fontWeight: '700', color: TEXT },
  onTimeBadge: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  onTimeText: { fontSize: 10, fontWeight: '700', color: GREEN },
  scanHint: {
    fontSize: 10,
    color: GREY,
    textAlign: 'center',
    marginTop: 8,
  },
  quickActions: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  actionIconGreen: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '700', color: TEXT },
  hintsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  hintsTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 16 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  hintNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  hintNumberText: { fontSize: 10, fontWeight: '700', color: TEXT },
  hintText: { flex: 1, fontSize: 12, color: GREY, lineHeight: 18 },
  loadingText: { color: GREY, marginTop: 12, fontSize: 14 },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorTitle: { fontSize: 22, fontWeight: '700', color: TEXT, marginBottom: 8, textAlign: 'center' },
  errorSubtitle: { fontSize: 14, color: GREY, textAlign: 'center', marginBottom: 24 },
  primaryBtn: {
    width: '100%',
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backLink: { color: GREY, fontSize: 14, marginTop: 8 },
});
