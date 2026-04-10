import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import QRCode from 'react-native-qrcode-svg';

const QR_REFRESH_INTERVAL = 30;

const tripData = {
  name: 'John Traveler',
  destination: 'Paris, France',
  dates: 'Jun 10 – Jun 20, 2025',
  services: [
    { emoji: '✈️', label: 'Flight', detail: 'TK1234 — Jun 10, 10:00' },
    { emoji: '🏨', label: 'Hotel', detail: 'Ibis Paris Centre — 10 nights' },
    { emoji: '🚕', label: 'Transport', detail: 'Airport transfers included' },
    { emoji: '🎭', label: 'Activities', detail: 'Eiffel Tower, Louvre & more' },
  ],
};

export default function QRPassScreen() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(QR_REFRESH_INTERVAL);
  const [qrValue, setQrValue] = useState('');
  const [error, setError] = useState('');

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
        // No biometrics available — skip for demo
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
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Verifying identity...</Text>
      </View>
    );
  }

  if (!authenticated) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.authTitle}>Authentication Required</Text>
        <Text style={styles.authSubtitle}>Your QR Pass is protected by biometric authentication.</Text>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.authBtn} onPress={authenticate}>
          <Text style={styles.authBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.headerLabel}>QR PASS</Text>
        <Text style={styles.title}>Your QR Pass</Text>
        <Text style={styles.subtitle}>Show this at check-in points</Text>
      </View>
      <View style={styles.divider} />

      {/* QR Code */}
      <View style={styles.qrContainer}>
        <View style={styles.watermark}>
          <Text style={styles.watermarkName}>{tripData.name}</Text>
        </View>
        {qrValue ? (
          <QRCode
            value={qrValue}
            size={220}
            backgroundColor="#fff"
            color="#0f172a"
          />
        ) : null}
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>Refreshes in</Text>
          <Text style={[
            styles.countdownTimer,
            countdown <= 10 && { color: '#f59e0b' }
          ]}>{countdown}s</Text>
        </View>
      </View>

      {/* Trip Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryDestination}>✈️ {tripData.destination}</Text>
        <View style={styles.datesPill}>
          <Text style={styles.summaryDates}>{tripData.dates}</Text>
        </View>
      </View>

      {/* Services */}
      <Text style={styles.sectionTitle}>THIS PASS COVERS</Text>
      {tripData.services.map((service, index) => (
        <View key={index} style={styles.serviceRow}>
          <Text style={styles.serviceEmoji}>{service.emoji}</Text>
          <View>
            <Text style={styles.serviceLabel}>{service.label}</Text>
            <Text style={styles.serviceDetail}>{service.detail}</Text>
          </View>
        </View>
      ))}

      <View style={styles.offlineBadge}>
        <Text style={styles.offlineText}>✅ Works Offline — QR stored securely on device</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d14' },
  contentContainer: { paddingHorizontal: 24, paddingBottom: 60 },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0d0d14',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  backButton: { alignSelf: 'flex-start', marginTop: 48, marginBottom: 20 },
  backText: { color: '#6366f1', fontSize: 16 },
  header: { marginBottom: 12 },
  headerLabel: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    marginBottom: 8
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#9ca3af' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 20 },
  qrContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  watermark: { marginBottom: 16 },
  watermarkName: { color: '#0d0d14', fontWeight: 'bold', fontSize: 16 },
  countdownContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  countdownLabel: { color: '#9ca3af', fontSize: 13 },
  countdownTimer: { color: '#22c55e', fontWeight: 'bold', fontSize: 18 },
  summaryCard: {
    backgroundColor: '#13131f',
    borderColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20
  },
  summaryDestination: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 10 },
  datesPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  summaryDates: { fontSize: 13, color: '#9ca3af' },
  sectionTitle: {
    fontSize: 10,
    color: '#4b5563',
    letterSpacing: 1.5,
    marginBottom: 10
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#13131f',
    borderColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  serviceEmoji: { fontSize: 22 },
  serviceLabel: { fontSize: 14, fontWeight: 'bold', color: '#ffffff' },
  serviceDetail: { fontSize: 12, color: '#9ca3af' },
  offlineBadge: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 8
  },
  offlineText: { color: '#22c55e', fontSize: 13 },
  lockIcon: { fontSize: 56, marginBottom: 24 },
  authTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  authSubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 24 },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  errorText: { color: '#f87171', textAlign: 'center' },
  authBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  authBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  backLink: { color: '#4b5563', fontSize: 14, marginTop: 16 },
  loadingText: { color: '#9ca3af', marginTop: 16, fontSize: 14 },
});