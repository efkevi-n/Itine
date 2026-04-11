import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';

const QR_REFRESH_INTERVAL = 30;

const tripData = {
  name: 'John Traveler',
  destination: 'Paris, France',
  dates: 'Jun 10 - Jun 20, 2025',
  services: [
    { icon: 'navigation', label: 'Flight', detail: 'TK1234 - Jun 10, 10:00' },
    { icon: 'home', label: 'Hotel', detail: 'Ibis Paris Centre - 10 nights' },
    { icon: 'truck', label: 'Transport', detail: 'Airport transfers included' },
    { icon: 'star', label: 'Activities', detail: 'Eiffel Tower, Louvre & more' },
  ],
};

export default function QRPassScreen() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(QR_REFRESH_INTERVAL);
  const [qrValue, setQrValue] = useState('');
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const generateQRValue = () => {
    const token = `TRIP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    return token;
  };

  const saveQRToStorage = async (value: string) => {
    await SecureStore.setItemAsync('qr_pass', value);
  };

  const loadOrGenerateQR = async () => {
    const stored = await SecureStore.getItemAsync('qr_pass');
    if (stored) {
      setQrValue(stored);
    } else {
      const newQR = generateQRValue();
      await saveQRToStorage(newQR);
      setQrValue(newQR);
    }
  };

  const refreshQR = async () => {
    const newQR = generateQRValue();
    await saveQRToStorage(newQR);
    setQrValue(newQR);
    setCountdown(QR_REFRESH_INTERVAL);
  };

  const authenticate = async () => {
    setLoading(true);
    setError('');
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setAuthenticated(true);
        await loadOrGenerateQR();
        setLoading(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to view your QR Pass',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        setAuthenticated(true);
        await loadOrGenerateQR();
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      setError('Biometric authentication error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    authenticate();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refreshQR();
          return QR_REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [authenticated]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Verifying identity...</Text>
      </View>
    );
  }

  if (!authenticated) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />
        <View style={styles.lockIconWrap}>
          <Feather name="lock" size={32} color="#6366f1" />
        </View>
        <Text style={styles.authTitle}>Authentication Required</Text>
        <Text style={styles.authSubtitle}>
          Your QR Pass is protected by biometric authentication.
        </Text>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.authBtn} onPress={authenticate}>
          <Text style={styles.authBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLinkBtn}>
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
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={18} color="#6366f1" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.eyebrow}>QR PASS</Text>
          <Text style={styles.title}>Your QR Pass</Text>
          <Text style={styles.subtitle}>Show this at check-in points</Text>
          <View style={styles.divider} />

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <Text style={styles.watermarkName}>{tripData.name}</Text>
            {qrValue ? (
              <QRCode
                value={qrValue}
                size={220}
                backgroundColor="#fff"
                color="#0d0d14"
              />
            ) : null}
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>Refreshes in</Text>
              <Text style={[
                styles.countdownTimer,
                countdown <= 10 && { color: '#f59e0b' }
              ]}>
                {countdown}s
              </Text>
            </View>
          </View>

          {/* Trip Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryDestination}>{tripData.destination}</Text>
            <View style={styles.datesPill}>
              <Feather name="calendar" size={12} color="#9ca3af" />
              <Text style={styles.summaryDates}>{tripData.dates}</Text>
            </View>
          </View>

          {/* Services */}
          <Text style={styles.sectionLabel}>THIS PASS COVERS</Text>
          {tripData.services.map((service, index) => (
            <View key={index} style={styles.serviceRow}>
              <View style={styles.serviceIconWrap}>
                <Feather name={service.icon as any} size={18} color="#6366f1" />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceLabel}>{service.label}</Text>
                <Text style={styles.serviceDetail}>{service.detail}</Text>
              </View>
            </View>
          ))}

          {/* Offline Badge */}
          <View style={styles.offlineBadge}>
            <Feather name="wifi-off" size={14} color="#22c55e" />
            <Text style={styles.offlineText}>
              Works Offline — QR stored securely on device
            </Text>
          </View>

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
  authTitle: {
    fontSize: 22, fontWeight: '700', color: '#ffffff',
    marginBottom: 8, textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 24,
  },
  errorBox: {
    width: '100%', backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.2)', borderWidth: 1,
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#f87171', textAlign: 'center' },
  authBtn: {
    width: '100%', height: 50, backgroundColor: '#6366f1',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
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
  eyebrow: {
    fontSize: 10, color: '#4b5563', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 16 },
  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 24,
  },
  qrContainer: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 28,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#6366f1', shadowOpacity: 0.3,
    shadowRadius: 20, elevation: 10,
  },
  watermarkName: {
    color: '#0d0d14', fontWeight: '700', fontSize: 16, marginBottom: 16,
  },
  countdownContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16,
  },
  countdownLabel: { color: '#9ca3af', fontSize: 13 },
  countdownTimer: { color: '#22c55e', fontWeight: '700', fontSize: 18 },
  summaryCard: {
    backgroundColor: '#13131f', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 16, marginBottom: 24,
  },
  summaryDestination: {
    fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 10,
  },
  datesPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  summaryDates: { fontSize: 13, color: '#9ca3af' },
  sectionLabel: {
    fontSize: 10, color: '#4b5563', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 12,
  },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#13131f', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  serviceIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  serviceInfo: { flex: 1 },
  serviceLabel: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  serviceDetail: { fontSize: 12, color: '#9ca3af' },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.2)', borderWidth: 1,
    borderRadius: 12, padding: 12, marginTop: 8,
  },
  offlineText: { color: '#22c55e', fontSize: 13, flex: 1 },
});