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
        <ActivityIndicator size="large" color="#38bdf8" />
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
        {error ? <Text style={styles.error}>{error}</Text> : null}
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
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🎫 Your QR Pass</Text>
      <Text style={styles.subtitle}>Show this at check-in points</Text>

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
        <Text style={styles.summaryDates}>📅 {tripData.dates}</Text>
      </View>

      {/* Services */}
      <Text style={styles.sectionTitle}>This pass covers:</Text>
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
  qrContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  watermark: { marginBottom: 16 },
  watermarkName: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  countdownContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  countdownLabel: { color: '#94a3b8', fontSize: 13 },
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
  lockIcon: { fontSize: 60, marginBottom: 24 },
  authTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  authSubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  error: { backgroundColor: '#7f1d1d', color: '#fca5a5', padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'center' },
  authBtn: { backgroundColor: '#38bdf8', borderRadius: 10, padding: 14, alignItems: 'center', width: '100%', marginBottom: 16 },
  authBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  backLink: { color: '#94a3b8', fontSize: 14 },
  loadingText: { color: '#94a3b8', marginTop: 16, fontSize: 14 },
});