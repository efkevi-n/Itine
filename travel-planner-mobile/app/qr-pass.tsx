import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated,
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

const QR_REFRESH_INTERVAL = 30;
const PASS_CACHE_PREFIX = 'trippass_';

const SERVICES = [
  { icon: 'navigation' as const, label: 'Flight' },
  { icon: 'home' as const, label: 'Hotel' },
  { icon: 'truck' as const, label: 'Transport' },
  { icon: 'film' as const, label: 'Activities' },
];

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

export default function QRPassScreen() {
  const router = useRouter();
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
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, []);

  const currentTripId = (typeof tripId === 'string' ? tripId : undefined) ?? resolvedTripId ?? undefined;

  const savePassToStorage = useCallback(async (data: CachedPass) => {
    if (!currentTripId) return;
    try {
      await SecureStore.setItemAsync(getCacheKey(currentTripId), JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [currentTripId]);

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
          ? (body.data as Record<string, unknown>).jti as string
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

      const trip = tripRes.data as { destination?: string; startDate?: string; endDate?: string; start_date?: string; end_date?: string } | null;
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
        const trip = tripRes.data as { destination?: string; startDate?: string; endDate?: string; start_date?: string; end_date?: string } | null;
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
    }, [isLocked, jti, unlock])
  );

  const qrPayload = jti != null && otp != null && currentTripId
    ? JSON.stringify({ jti, otp, tripId: currentTripId })
    : '';

  const datesFormatted = startDate && endDate ? formatTripDateRange(startDate, endDate) : '';

  if (!currentTripId && !paramJti) {
    return null;
  }

  if (loading && !jti) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading your pass...</Text>
      </View>
    );
  }

  if (loadError && !offlineMode) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />
        <View style={styles.lockIconWrap}>
          <Feather name="alert-circle" size={32} color="#6366f1" />
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
      <View style={styles.glowOrbTop} />
      <View style={styles.glowOrbBottom} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
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

          {(offlineMode || !isOnline) ? (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                {!isOnline ? OFFLINE_MESSAGES.offlineOtpWarning : OFFLINE_MESSAGES.offlineCachedPass}
              </Text>
            </View>
          ) : null}

          <BiometricGate isLocked={isLocked} lockState={lockState} onUnlock={unlock}>
            <View onTouchEnd={resetLockTimer}>
              <View style={styles.qrContainer}>
                <Text style={styles.watermarkName}>{userName || 'Traveler'}</Text>
                {qrPayload ? (
                  <QRCode
                    value={qrPayload}
                    size={220}
                    backgroundColor="#fff"
                    color="#0d0d14"
                  />
                ) : null}
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownLabel}>Refreshes in</Text>
                  <Text style={[styles.countdownTimer, countdown <= 10 && { color: '#f59e0b' }]}>
                    {countdown}s
                  </Text>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryDestination}>{destination || '—'}</Text>
                {datesFormatted ? (
                  <View style={styles.datesPill}>
                    <Feather name="calendar" size={12} color="#9ca3af" />
                    <Text style={styles.summaryDates}>{datesFormatted}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.sectionLabel}>THIS PASS COVERS</Text>
              {SERVICES.map((service, index) => (
                <View key={index} style={styles.serviceRow}>
                  <View style={styles.serviceIconWrap}>
                    <Feather name={service.icon} size={18} color="#6366f1" />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceLabel}>{service.label}</Text>
                    <Text style={styles.serviceDetail}>Included</Text>
                  </View>
                </View>
              ))}

              <View style={styles.offlineBadge}>
                <Feather name="wifi-off" size={14} color="#22c55e" />
                <Text style={styles.offlineText}>
                  {offlineMode ? 'Offline mode — QR stored securely on device' : 'Works Offline — pass cached on device'}
                </Text>
              </View>
            </View>
          </BiometricGate>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0d14' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 60 },
  glowOrbTop: {
    position: 'absolute', top: -100, right: -80,
    width: 320, height: 320, borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  glowOrbBottom: {
    position: 'absolute', bottom: -120, left: -80,
    width: 280, height: 280, borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  centerContainer: {
    flex: 1, backgroundColor: '#0d0d14',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  lockIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  authTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
  authSubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 24 },
  authBtn: {
    width: '100%', height: 50, backgroundColor: '#6366f1',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  authBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  backLinkBtn: { marginTop: 4 },
  backLink: { color: '#4b5563', fontSize: 14 },
  loadingText: { color: '#9ca3af', marginTop: 16, fontSize: 14 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 48, marginBottom: 24, alignSelf: 'flex-start',
  },
  backText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  eyebrow: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 16 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 24 },
  offlineBanner: {
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)', borderRadius: 10, padding: 10, marginBottom: 16,
  },
  offlineBannerText: { color: '#f59e0b', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  qrContainer: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 28,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#6366f1', shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  watermarkName: { color: '#0d0d14', fontWeight: '700', fontSize: 16, marginBottom: 16 },
  countdownContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  countdownLabel: { color: '#9ca3af', fontSize: 13 },
  countdownTimer: { color: '#22c55e', fontWeight: '700', fontSize: 18 },
  summaryCard: {
    backgroundColor: '#13131f', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 16, marginBottom: 24,
  },
  summaryDestination: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 10 },
  datesPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  summaryDates: { fontSize: 13, color: '#9ca3af' },
  sectionLabel: { fontSize: 10, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#13131f', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  serviceIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  serviceInfo: { flex: 1 },
  serviceLabel: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  serviceDetail: { fontSize: 12, color: '#9ca3af' },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.2)',
    borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8,
  },
  offlineText: { color: '#22c55e', fontSize: 13, flex: 1 },
});
