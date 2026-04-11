import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { api } from '@/api/client';
import { DestinationSearch } from '@/components/DestinationSearch';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { useConnectivity } from '@/hooks/useConnectivity';
import { OFFLINE_MESSAGES } from '@/constants/offline';
import { LOADER_MESSAGES_ITINERARY } from '@/constants/loader';
import { getErrorMessage } from '@/utils/errorHandler';

const currencies = ['USD', 'EUR', 'GBP', 'TRY'];

const preferences = [
  { id: 'budget_hotel', label: 'Budget Hotel', apiValue: 'budget hotel' },
  { id: 'hostel', label: 'Hostel', apiValue: 'hostel' },
  { id: 'private_room', label: 'Private Room', apiValue: 'private room' },
  { id: 'window_seat', label: 'Window Seat', apiValue: 'window seat' },
  { id: 'aisle_seat', label: 'Aisle Seat', apiValue: 'aisle seat' },
  { id: 'vegetarian', label: 'Vegetarian', apiValue: 'vegetarian meals' },
  { id: 'nonstop_flights', label: 'Non-stop Flights', apiValue: 'non-stop flights only' },
];

function parseDate(str: string): Date | null {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function isValidDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

function validate(
  destination: string,
  origin: string,
  startDate: string,
  endDate: string,
  budget: string
): string | null {
  if (!destination.trim()) return 'Destination is required.';
  if (!origin.trim()) return 'Origin city is required.';
  if (!startDate.trim()) return 'Start date is required.';
  if (!endDate.trim()) return 'End date is required.';
  if (!isValidDateString(startDate)) return 'Start date must be in YYYY-MM-DD format.';
  if (!isValidDateString(endDate)) return 'End date must be in YYYY-MM-DD format.';
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return 'Please enter valid dates.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) return 'Start date must be in the future.';
  if (end <= start) return 'End date must be after start date.';
  const budgetNum = parseFloat(budget);
  if (isNaN(budgetNum) || budgetNum <= 0) return 'Budget must be greater than 0.';
  return null;
}

export default function NewTripScreen() {
  const router = useRouter();
  const { isOnline } = useConnectivity();
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, []);

  const togglePref = (id: string) => {
    if (loading) return;
    setSelectedPrefs(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    setError('');
    if (!isOnline) {
      setError(OFFLINE_MESSAGES.cannotCreateTrip);
      return;
    }
    const validationError = validate(destination, origin, startDate, endDate, budget);
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const createRes = await api.post<{ id?: string; data?: { id?: string } }>('/trips', {
        destination: destination.trim(),
        originCity: origin.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        totalBudget: parseFloat(budget),
        currency,
        preferences: selectedPrefs.map(
          (id) => preferences.find((p) => p.id === id)?.apiValue ?? id
        ),
      });

      const tripId =
        createRes.data?.id ??
        (createRes.data as { data?: { id?: string } })?.data?.id;
      if (!tripId) {
        setError('Server did not return a trip ID.');
        setLoading(false);
        return;
      }

      const genRes = await api.post<{ jobId?: string; id?: string }>(
        '/itinerary/generate',
        { tripId }
      );
      const jobId = genRes.data?.jobId ?? genRes.data?.id;
      if (!jobId) {
        setError('Server did not return a job ID.');
        setLoading(false);
        return;
      }

      const pollInterval = 3000;
      const maxAttempts = 20;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, pollInterval));
        const jobRes = await api.get<{ status?: string }>(`/itinerary/jobs/${jobId}`);
        const status = (jobRes.data?.status ?? '').toLowerCase();
        if (status === 'complete' || status === 'completed') {
          setLoading(false);
          router.replace({ pathname: '/itinerary-review', params: { tripId } });
          return;
        }
        if (status === 'failed' || status === 'error') {
          const msg =
            (jobRes.data as { message?: string })?.message ??
            'Itinerary generation failed.';
          setError(msg);
          setLoading(false);
          return;
        }
      }

      setError('Generation is taking longer than expected. Please check "Your Trips" later.');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !isOnline;

  const inputBorder = (field: string) => ({
    borderColor: focusedField === field
      ? 'rgba(99,102,241,0.5)'
      : 'rgba(255,255,255,0.07)',
  });

  return (
    <>
      <View style={styles.screen}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={disabled}>
                <Feather name="chevron-left" size={18} color="#6366f1" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>

              <Text style={styles.eyebrow}>NEW TRIP</Text>
              <Text style={styles.title}>Plan Your Journey</Text>
              <Text style={styles.subtitle}>Fill in the details below</Text>
              <View style={styles.divider} />

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {!isOnline ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{OFFLINE_MESSAGES.cannotCreateTrip}</Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>DESTINATION CITY</Text>
                <DestinationSearch
                  placeholder="e.g. Paris, Tokyo, New York"
                  value={destination}
                  onSelect={(city, country) => setDestination(`${city}, ${country}`)}
                  editable={!disabled}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>ORIGIN CITY</Text>
                <DestinationSearch
                  placeholder="e.g. London, Istanbul, Berlin"
                  value={origin}
                  onSelect={(city, country) => setOrigin(`${city}, ${country}`)}
                  editable={!disabled}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>START DATE</Text>
                <TextInput
                  style={[styles.input, inputBorder('startDate')]}
                  placeholder="e.g. 2026-06-10"
                  placeholderTextColor="#4b5563"
                  value={startDate}
                  onChangeText={setStartDate}
                  editable={!disabled}
                  onFocus={() => setFocusedField('startDate')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>END DATE</Text>
                <TextInput
                  style={[styles.input, inputBorder('endDate')]}
                  placeholder="e.g. 2026-06-20"
                  placeholderTextColor="#4b5563"
                  value={endDate}
                  onChangeText={setEndDate}
                  editable={!disabled}
                  onFocus={() => setFocusedField('endDate')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>TOTAL BUDGET</Text>
                <View style={styles.budgetRow}>
                  <TextInput
                    style={[styles.input, styles.budgetInput, inputBorder('budget')]}
                    placeholder="e.g. 2000"
                    placeholderTextColor="#4b5563"
                    value={budget}
                    onChangeText={setBudget}
                    keyboardType="numeric"
                    editable={!disabled}
                    onFocus={() => setFocusedField('budget')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <View style={styles.currencyRow}>
                    {currencies.map(c => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.currencyBtn, currency === c && styles.currencyBtnActive]}
                        onPress={() => !disabled && setCurrency(c)}
                      >
                        <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>PREFERENCES</Text>
                <View style={styles.prefsGrid}>
                  {preferences.map(pref => (
                    <TouchableOpacity
                      key={pref.id}
                      style={[styles.prefChip, selectedPrefs.includes(pref.id) && styles.prefChipActive]}
                      onPress={() => togglePref(pref.id)}
                    >
                      <Text style={[styles.prefText, selectedPrefs.includes(pref.id) && styles.prefTextActive]}>
                        {pref.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.generateBtn, disabled && styles.generateBtnDisabled]}
                onPress={handleGenerate}
                disabled={disabled}
                activeOpacity={0.9}
              >
                <Text style={styles.generateBtnText}>Generate My Trip</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <FullScreenLoader visible={loading} messages={LOADER_MESSAGES_ITINERARY} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0d14' },
  flex: { flex: 1 },
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
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 60 },
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
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 24 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 10, padding: 12, marginBottom: 20,
  },
  errorText: { color: '#f87171', textAlign: 'center', fontSize: 14 },
  field: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 10, color: '#4b5563', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 8,
  },
  input: {
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, height: 52,
    paddingHorizontal: 16,
    fontSize: 15, color: '#ffffff',
  },
  budgetRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  budgetInput: { flex: 1 },
  currencyRow: { flexDirection: 'row', gap: 6 },
  currencyBtn: {
    backgroundColor: '#13131f',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10,
  },
  currencyBtnActive: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: '#6366f1',
  },
  currencyText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  currencyTextActive: { color: '#6366f1' },
  prefsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefChip: {
    backgroundColor: '#13131f',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  prefChipActive: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: '#6366f1',
  },
  prefText: { color: '#9ca3af', fontSize: 14 },
  prefTextActive: { color: '#6366f1', fontWeight: '600' },
  generateBtn: {
    width: '100%', height: 54, backgroundColor: '#6366f1',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
});
