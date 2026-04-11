import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const currencies = ['USD', 'EUR', 'GBP', 'TRY'];

const preferences = [
  { id: 'budget_hotel', label: 'Budget Hotel' },
  { id: 'hostel', label: 'Hostel' },
  { id: 'private_room', label: 'Private Room' },
  { id: 'window_seat', label: 'Window Seat' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'adventure', label: 'Adventure' },
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
      await new Promise(resolve => setTimeout(resolve, 3000));
      router.push('/itinerary-review');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputBorder = (field: string) => ({
    borderColor: focusedField === field
      ? 'rgba(99,102,241,0.5)'
      : 'rgba(255,255,255,0.07)',
  });

  return (
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

            {/* Back Button */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="chevron-left" size={18} color="#6366f1" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            {/* Header */}
            <Text style={styles.eyebrow}>NEW TRIP</Text>
            <Text style={styles.title}>Plan Your Journey</Text>
            <Text style={styles.subtitle}>Fill in the details below</Text>
            <View style={styles.divider} />

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Destination */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>DESTINATION CITY</Text>
              <TextInput
                style={[styles.input, inputBorder('destination')]}
                placeholder="e.g. Paris, Tokyo, New York"
                placeholderTextColor="#4b5563"
                value={destination}
                onChangeText={setDestination}
                onFocus={() => setFocusedField('destination')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Origin */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ORIGIN CITY</Text>
              <TextInput
                style={[styles.input, inputBorder('origin')]}
                placeholder="e.g. London, Istanbul, Berlin"
                placeholderTextColor="#4b5563"
                value={origin}
                onChangeText={setOrigin}
                onFocus={() => setFocusedField('origin')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Start Date */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>START DATE</Text>
              <TextInput
                style={[styles.input, inputBorder('startDate')]}
                placeholder="e.g. 2026-06-10"
                placeholderTextColor="#4b5563"
                value={startDate}
                onChangeText={setStartDate}
                onFocus={() => setFocusedField('startDate')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* End Date */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>END DATE</Text>
              <TextInput
                style={[styles.input, inputBorder('endDate')]}
                placeholder="e.g. 2026-06-20"
                placeholderTextColor="#4b5563"
                value={endDate}
                onChangeText={setEndDate}
                onFocus={() => setFocusedField('endDate')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Budget Row */}
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
                  onFocus={() => setFocusedField('budget')}
                  onBlur={() => setFocusedField(null)}
                />
                <View style={styles.currencyRow}>
                  {currencies.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.currencyBtn,
                        currency === c && styles.currencyBtnActive,
                      ]}
                      onPress={() => setCurrency(c)}
                    >
                      <Text style={[
                        styles.currencyText,
                        currency === c && styles.currencyTextActive,
                      ]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Preferences */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PREFERENCES</Text>
              <View style={styles.prefsGrid}>
                {preferences.map(pref => (
                  <TouchableOpacity
                    key={pref.id}
                    style={[
                      styles.prefChip,
                      selectedPrefs.includes(pref.id) && styles.prefChipActive,
                    ]}
                    onPress={() => togglePref(pref.id)}
                  >
                    <Text style={[
                      styles.prefText,
                      selectedPrefs.includes(pref.id) && styles.prefTextActive,
                    ]}>
                      {pref.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
              onPress={handleGenerate}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.generateBtnText}>Generating your trip...</Text>
                </View>
              ) : (
                <Text style={styles.generateBtnText}>Generate My Trip</Text>
              )}
            </TouchableOpacity>

            {loading && (
              <Text style={styles.loadingHint}>
                This may take a few seconds. Please wait!
              </Text>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 24,
  },
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
  generateBtnDisabled: { opacity: 0.85 },
  generateBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  loadingHint: {
    color: '#4b5563', textAlign: 'center',
    marginTop: 12, fontSize: 12, fontStyle: 'italic',
  },
});