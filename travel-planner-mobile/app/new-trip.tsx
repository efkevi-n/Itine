import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/api/client';
import { DestinationSearch } from '@/components/DestinationSearch';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { useConnectivity } from '@/hooks/useConnectivity';
import { OFFLINE_MESSAGES } from '@/constants/offline';
import { LOADER_MESSAGES_ITINERARY } from '@/constants/loader';
import { getErrorMessage } from '@/utils/errorHandler';
import { theme } from '@/constants/theme';

const currencies = ['USD', 'EUR', 'GBP', 'TRY'];

// id = form value; apiValue = sent to API (e.g. "budget hotel")
const preferences = [
  { id: 'budget_hotel', label: '🏨 Budget hotel', apiValue: 'budget hotel' },
  { id: 'hostel', label: '🛏️ Hostel', apiValue: 'hostel' },
  { id: 'private_room', label: '🚪 Private room', apiValue: 'private room' },
  { id: 'window_seat', label: '🪟 Window seat', apiValue: 'window seat' },
  { id: 'aisle_seat', label: '🪑 Aisle seat', apiValue: 'aisle seat' },
  { id: 'vegetarian', label: '🥗 Vegetarian meals', apiValue: 'vegetarian meals' },
  { id: 'nonstop_flights', label: '✈️ Non-stop flights only', apiValue: 'non-stop flights only' },
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
        const jobRes = await api.get<{ status?: string }>(
          `/itinerary/jobs/${jobId}`
        );
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

  return (
    <>
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={disabled}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>✈️ Plan a New Trip</Text>
        <Text style={styles.subtitle}>Tell us where you want to go</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Destination City *</Text>
        <DestinationSearch
          placeholder="e.g. Paris, Tokyo, New York"
          value={destination}
          onSelect={(city, country) => setDestination(`${city}, ${country}`)}
          editable={!disabled}
        />

        <Text style={styles.label}>Origin City *</Text>
        <DestinationSearch
          placeholder="e.g. London, Istanbul, Berlin"
          value={origin}
          onSelect={(city, country) => setOrigin(`${city}, ${country}`)}
          editable={!disabled}
        />

        <Text style={styles.label}>Start Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD (e.g. 2026-04-01)"
          placeholderTextColor="#aaa"
          value={startDate}
          onChangeText={setStartDate}
          editable={!disabled}
        />

        <Text style={styles.label}>End Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD (e.g. 2026-04-07)"
          placeholderTextColor="#aaa"
          value={endDate}
          onChangeText={setEndDate}
          editable={!disabled}
        />

        <Text style={styles.label}>Total Budget *</Text>
        <View style={styles.budgetRow}>
          <TextInput
            style={[styles.input, styles.inputBudget]}
            placeholder="e.g. 2000"
            placeholderTextColor="#aaa"
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric"
            editable={!disabled}
          />
          <View style={styles.currencyRow}>
            {currencies.map((c) => (
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

        <Text style={styles.label}>Preferences (optional)</Text>
        <View style={styles.prefsGrid}>
          {preferences.map((pref) => (
            <TouchableOpacity
              key={pref.id}
              style={[styles.prefBtn, selectedPrefs.includes(pref.id) && styles.prefBtnActive]}
              onPress={() => togglePref(pref.id)}
            >
              <Text
                style={[
                  styles.prefText,
                  selectedPrefs.includes(pref.id) && styles.prefTextActive,
                ]}
              >
                {pref.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!isOnline ? (
          <Text style={styles.error}>{OFFLINE_MESSAGES.cannotCreateTrip}</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.generateBtn, disabled && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={disabled}
        >
          <Text style={styles.generateText}>🤖 Generate My Trip</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>

      <FullScreenLoader visible={loading} messages={LOADER_MESSAGES_ITINERARY} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  backButton: { marginTop: 60, marginBottom: 16 },
  backText: { color: '#38bdf8', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  error: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  label: { fontSize: 13, color: '#94a3b8', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#1e293b',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 8,
  },
  budgetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  inputBudget: { flex: 1, marginRight: 8 },
  currencyRow: { flexDirection: 'row', gap: 6 },
  currencyBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  currencyBtnActive: { backgroundColor: '#38bdf8' },
  currencyText: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold' },
  currencyTextActive: { color: '#0f172a' },
  prefsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  prefBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  prefBtnActive: { backgroundColor: '#38bdf8' },
  prefText: { color: '#94a3b8', fontSize: 13 },
  prefTextActive: { color: '#0f172a', fontWeight: 'bold' },
  generateBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  generateBtnDisabled: { opacity: 0.7 },
  generateText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 16 },
  spacer: { height: 40 },
});
