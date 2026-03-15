import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import QRCode from 'react-native-qrcode-svg';
import { trippassApi } from '@/api/trippass';
import { userApi } from '@/api/user';
import { tripsApi } from '@/api/trips';
import { formatTripDateRange } from '@/utils/dateFormat';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { OFFLINE_MESSAGES } from '@/constants/offline';
import { BiometricGate } from '@/components/BiometricGate';
import { theme } from '@/constants/theme';

const QR_REFRESH_INTERVAL = 30;
const PASS_CACHE_PREFIX = 'trippass_';

interface CachedPass {
  jti: string;
  otp: string;
  tripId: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  userName?: string;
  userPhotoUrl?: string;
  savedAt: number;
}

const SERVICES = [
  { emoji: '✈️', label: 'Flight' },
  { emoji: '🏨', label: 'Hotel' },
  { emoji: '🚕', label: 'Transport' },
  { emoji: '🎭', label: 'Activities' },
];

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
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [destination, setDestination] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [offlineMode, setOfflineMode] = useState(false);
  const countdownRef = useRef<number | null>(null);
  const loadedByJtiRef = useRef(false);

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
      const rawJti = (typeof body?.jti === 'string' ? body.jti : undefined)
        ?? (body?.data && typeof (body.data as Record<string, unknown>)?.jti === 'string' ? (body.data as Record<string, unknown>).jti as string : undefined);
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

      const profile = profileRes.data as { name?: string; photoUrl?: string } | null;
      if (profile) {
        setUserName(typeof profile.name === 'string' ? profile.name : '');
        setUserPhotoUrl(typeof profile.photoUrl === 'string' ? profile.photoUrl : null);
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
        userPhotoUrl: typeof profile?.photoUrl === 'string' ? profile.photoUrl : undefined,
        savedAt: Date.now(),
      });
    } catch {
      const cached = await loadPassFromStorage();
      if (cached) {
        setJti(cached.jti);
        setOtp(cached.otp || null);
        setUserName(cached.userName ?? '');
        setUserPhotoUrl(cached.userPhotoUrl ?? null);
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
        const profile = profileRes.data as { name?: string; photoUrl?: string } | null;
        if (profile) {
          setUserName(typeof profile.name === 'string' ? profile.name : '');
          setUserPhotoUrl(typeof profile.photoUrl === 'string' ? profile.photoUrl : null);
        }
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

  const datesFormatted = startDate && endDate
    ? formatTripDateRange(startDate, endDate)
    : '';

  if (!currentTripId && !paramJti) {
    return null;
  }

  if (loading && !jti) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your pass...</Text>
      </View>
    );
  }

  if (loadError && !offlineMode) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      onScroll={resetLockTimer}
      scrollEventThrottle={16}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🎫 Your QR Pass</Text>
      <Text style={styles.subtitle}>Show this at check-in points</Text>

      {(offlineMode || !isOnline) ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            {!isOnline ? OFFLINE_MESSAGES.offlineOtpWarning : OFFLINE_MESSAGES.offlineCachedPass}
          </Text>
        </View>
      ) : null}

      <BiometricGate
        isLocked={isLocked}
        lockState={lockState}
        onUnlock={unlock}
      >
        <View onTouchEnd={resetLockTimer}>
          <View style={styles.qrContainer}>
            {userPhotoUrl ? (
              <Image source={{ uri: userPhotoUrl }} style={styles.avatar} />
            ) : null}
            {qrPayload ? (
              <QRCode
                value={qrPayload}
                size={250}
                backgroundColor="#fff"
                color="#0f172a"
              />
            ) : null}
            <Text style={styles.userNameBelow}>{userName || 'Traveler'}</Text>
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>Refreshes in</Text>
              <Text style={[styles.countdownTimer, countdown <= 10 && styles.countdownTimerLow]}>{countdown}s</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryDestination}>✈️ {destination || '—'}</Text>
            <Text style={styles.summaryDates}>📅 {datesFormatted || '—'}</Text>
          </View>

          <Text style={styles.sectionTitle}>This pass covers:</Text>
          {SERVICES.map((service, index) => (
            <View key={index} style={styles.serviceRow}>
              <Text style={styles.serviceEmoji}>{service.emoji}</Text>
              <View>
                <Text style={styles.serviceLabel}>{service.label}</Text>
                <Text style={styles.serviceDetail}>Included</Text>
              </View>
            </View>
          ))}

          {offlineMode ? (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineText}>Offline mode — QR stored securely on device</Text>
            </View>
          ) : (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineText}>✅ Works offline — pass cached on device</Text>
            </View>
          )}
        </View>
      </BiometricGate>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  centerContainer: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  backButton: { marginTop: 60, marginBottom: 16 },
  backText: { color: theme.colors.primary, fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: theme.colors.subtext, marginBottom: 24 },
  offlineBanner: { backgroundColor: theme.colors.warning, borderRadius: theme.radius.sm, padding: 10, marginBottom: 16 },
  offlineBannerText: { color: theme.colors.background, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  qrContainer: { backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: 24, alignItems: 'center', marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 16 },
  userNameBelow: { marginTop: 16, color: theme.colors.background, fontWeight: 'bold', fontSize: 16 },
  countdownContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  countdownLabel: { color: '#64748b', fontSize: 13 },
  countdownTimer: { color: theme.colors.success, fontWeight: 'bold', fontSize: 18 },
  countdownTimerLow: { color: theme.colors.warning },
  summaryCard: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: 16, marginBottom: 24 },
  summaryDestination: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 },
  summaryDates: { fontSize: 14, color: theme.colors.subtext },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: 10, padding: 14, marginBottom: 10 },
  serviceEmoji: { fontSize: 24 },
  serviceLabel: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  serviceDetail: { fontSize: 12, color: theme.colors.subtext },
  offlineBadge: { backgroundColor: '#14532d', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  offlineText: { color: theme.colors.success, fontSize: 13 },
  loadingText: { color: theme.colors.subtext, marginTop: 16, fontSize: 14 },
  errorText: { color: theme.colors.error, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginBottom: 12 },
  retryBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 16 },
  backLink: { color: theme.colors.subtext, fontSize: 14 },
  spacer: { height: 40 },
});
