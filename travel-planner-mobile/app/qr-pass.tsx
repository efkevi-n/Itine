import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import QRCode from 'react-native-qrcode-svg';
import { trippassApi } from '@/api/trippass';
import { userApi } from '@/api/user';
import { tripsApi } from '@/api/trips';
import { formatTripDateRange } from '@/utils/dateFormat';
import { useConnectivity } from '@/hooks/useConnectivity';
import { OFFLINE_MESSAGES } from '@/constants/offline';

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
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(QR_REFRESH_INTERVAL);
  const [jti, setJti] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [destination, setDestination] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [offlineMode, setOfflineMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInProgress, setAuthInProgress] = useState(false);
  const [authPromptDone, setAuthPromptDone] = useState(false);
  const countdownRef = useRef<number | null>(null);

  const currentTripId = typeof tripId === 'string' ? tripId : undefined;

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

  useEffect(() => {
    if (!currentTripId) {
      router.replace('/(tabs)');
      return;
    }
    loadData();
  }, [currentTripId, router, loadData]);

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
    if (!authenticated || !jti || !isOnline) return;
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
  }, [authenticated, jti, isOnline, refreshOtp]);

  const authenticate = async () => {
    setAuthError(null);
    setAuthInProgress(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setAuthPromptDone(true);
        setAuthInProgress(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to view your QR Pass',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        setAuthenticated(true);
      } else {
        setAuthError('Authentication failed. Please try again.');
      }
    } catch {
      setAuthError('Biometric authentication error.');
    } finally {
      setAuthInProgress(false);
      setAuthPromptDone(true);
    }
  };

  const handleShowWithoutBiometrics = () => {
    setAuthenticated(true);
  };

  useEffect(() => {
    if (!currentTripId || loadError || loading || authPromptDone) return;
    if (jti == null) return;
    authenticate();
  }, [currentTripId, loadError, loading, jti, authPromptDone]);

  const qrPayload = jti != null && otp != null && currentTripId
    ? JSON.stringify({ jti, otp, tripId: currentTripId })
    : '';

  const datesFormatted = startDate && endDate
    ? formatTripDateRange(startDate, endDate)
    : '';

  if (!currentTripId) {
    return null;
  }

  if (loading && !jti) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
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

  if (authInProgress) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Verifying identity...</Text>
      </View>
    );
  }

  if (!authenticated && jti) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.authTitle}>Authentication Required</Text>
        <Text style={styles.authSubtitle}>Your QR Pass is protected by biometric authentication.</Text>
        {authError ? <Text style={styles.error}>{authError}</Text> : null}
        <TouchableOpacity style={styles.authBtn} onPress={authenticate}>
          <Text style={styles.authBtnText}>Unlock with Biometrics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fallbackBtn} onPress={handleShowWithoutBiometrics}>
          <Text style={styles.fallbackBtnText}>Show QR Pass anyway</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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
          <Text style={[
            styles.countdownTimer,
            countdown <= 10 && { color: '#f59e0b' }
          ]}>{countdown}s</Text>
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

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  centerContainer: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 24 },
  backButton: { marginTop: 60, marginBottom: 16 },
  backText: { color: '#38bdf8', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  offlineBanner: { backgroundColor: '#f59e0b', borderRadius: 8, padding: 10, marginBottom: 16 },
  offlineBannerText: { color: '#0f172a', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  qrContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 16 },
  userNameBelow: { marginTop: 16, color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  countdownContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  countdownLabel: { color: '#64748b', fontSize: 13 },
  countdownTimer: { color: '#22c55e', fontWeight: 'bold', fontSize: 18 },
  summaryCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 24 },
  summaryDestination: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  summaryDates: { fontSize: 14, color: '#94a3b8' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', borderRadius: 10, padding: 14, marginBottom: 10 },
  serviceEmoji: { fontSize: 24 },
  serviceLabel: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  serviceDetail: { fontSize: 12, color: '#94a3b8' },
  offlineBadge: { backgroundColor: '#14532d', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  offlineText: { color: '#22c55e', fontSize: 13 },
  loadingText: { color: '#94a3b8', marginTop: 16, fontSize: 14 },
  errorText: { color: '#fca5a5', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#38bdf8', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginBottom: 12 },
  retryBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  backLink: { color: '#94a3b8', fontSize: 14 },
  lockIcon: { fontSize: 60, marginBottom: 24 },
  authTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  authSubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  error: { backgroundColor: 'rgba(127,29,29,0.5)', color: '#fca5a5', padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'center' },
  authBtn: { backgroundColor: '#38bdf8', borderRadius: 10, padding: 14, alignItems: 'center', width: '100%', marginBottom: 12 },
  authBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  fallbackBtn: { backgroundColor: '#1e293b', borderRadius: 10, padding: 14, alignItems: 'center', width: '100%', marginBottom: 16 },
  fallbackBtnText: { color: '#38bdf8', fontWeight: '600', fontSize: 16 },
});
