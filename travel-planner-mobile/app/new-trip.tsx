import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';

const currencies = ['USD', 'EUR', 'GBP', 'TRY'];

const preferences = [
  { id: 'budget_hotel', label: '🏨 Budget Hotel' },
  { id: 'hostel', label: '🛏️ Hostel' },
  { id: 'private_room', label: '🚪 Private Room' },
  { id: 'window_seat', label: '🪟 Window Seat' },
  { id: 'vegetarian', label: '🥗 Vegetarian Meals' },
  { id: 'adventure', label: '🧗 Adventure Activities' },
];

export default function NewTripScreen() {
  const router = useRouter();
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
    setSelectedPrefs(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    setError('');
    if (!destination || !origin || !startDate || !endDate || !budget) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      // Simulate AI generation (replace with real API call)
      await new Promise(resolve => setTimeout(resolve, 3000));
      router.push('/itinerary-review');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>✈️ Plan a New Trip</Text>
      <Text style={styles.subtitle}>Tell us where you want to go</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Destination City *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Paris, Tokyo, New York"
        placeholderTextColor="#aaa"
        value={destination}
        onChangeText={setDestination}
      />

      <Text style={styles.label}>Origin City *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. London, Istanbul, Berlin"
        placeholderTextColor="#aaa"
        value={origin}
        onChangeText={setOrigin}
      />

      <Text style={styles.label}>Start Date *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 2025-06-10"
        placeholderTextColor="#aaa"
        value={startDate}
        onChangeText={setStartDate}
      />

      <Text style={styles.label}>End Date *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 2025-06-20"
        placeholderTextColor="#aaa"
        value={endDate}
        onChangeText={setEndDate}
      />

      <Text style={styles.label}>Total Budget *</Text>
      <View style={styles.budgetRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          placeholder="e.g. 2000"
          placeholderTextColor="#aaa"
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
        />
        <View style={styles.currencyRow}>
          {currencies.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.currencyBtn, currency === c && styles.currencyBtnActive]}
              onPress={() => setCurrency(c)}
            >
              <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.label}>Preferences (optional)</Text>
      <View style={styles.prefsGrid}>
        {preferences.map(pref => (
          <TouchableOpacity
            key={pref.id}
            style={[styles.prefBtn, selectedPrefs.includes(pref.id) && styles.prefBtnActive]}
            onPress={() => togglePref(pref.id)}
          >
            <Text style={[styles.prefText, selectedPrefs.includes(pref.id) && styles.prefTextActive]}>
              {pref.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={loading}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#0f172a" style={{ marginRight: 8 }} />
            <Text style={styles.generateText}>AI is generating your trip...</Text>
          </View>
        ) : (
          <Text style={styles.generateText}>🤖 Generate My Trip</Text>
        )}
      </TouchableOpacity>

      {loading && (
        <Text style={styles.loadingHint}>This may take 10-15 seconds. Please wait!</Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  backButton: { marginTop: 60, marginBottom: 16 },
  backText: { color: '#38bdf8', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  error: { backgroundColor: '#7f1d1d', color: '#fca5a5', padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 13, color: '#94a3b8', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#1e293b', color: '#fff', borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 8 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  currencyRow: { flexDirection: 'row', gap: 6 },
  currencyBtn: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  currencyBtnActive: { backgroundColor: '#38bdf8' },
  currencyText: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold' },
  currencyTextActive: { color: '#0f172a' },
  prefsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  prefBtn: { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  prefBtnActive: { backgroundColor: '#38bdf8' },
  prefText: { color: '#94a3b8', fontSize: 13 },
  prefTextActive: { color: '#0f172a', fontWeight: 'bold' },
  generateBtn: { backgroundColor: '#38bdf8', borderRadius: 12, padding: 16, alignItems: 'center' },
  generateText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center' },
  loadingHint: { color: '#94a3b8', textAlign: 'center', marginTop: 12, fontSize: 13 },
});