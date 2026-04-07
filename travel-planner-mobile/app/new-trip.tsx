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
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>NEW TRIP</Text>
        <Text style={styles.title}>Plan Your Journey</Text>
        <Text style={styles.subtitle}>Fill in the details below</Text>
        <View style={styles.headerDivider} />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>Destination City *</Text>
        <View
          style={[
            styles.inputWrap,
            focusedField === 'destination' && styles.inputWrapFocused,
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="e.g. Paris, Tokyo, New York"
            placeholderTextColor="#4b5563"
            value={destination}
            onChangeText={setDestination}
            onFocus={() => setFocusedField('destination')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Origin City *</Text>
        <View
          style={[
            styles.inputWrap,
            focusedField === 'origin' && styles.inputWrapFocused,
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="e.g. London, Istanbul, Berlin"
            placeholderTextColor="#4b5563"
            value={origin}
            onChangeText={setOrigin}
            onFocus={() => setFocusedField('origin')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Start Date *</Text>
        <View
          style={[
            styles.inputWrap,
            focusedField === 'startDate' && styles.inputWrapFocused,
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="e.g. 2026-06-10"
            placeholderTextColor="#4b5563"
            value={startDate}
            onChangeText={setStartDate}
            onFocus={() => setFocusedField('startDate')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>End Date *</Text>
        <View
          style={[
            styles.inputWrap,
            focusedField === 'endDate' && styles.inputWrapFocused,
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="e.g. 2026-06-20"
            placeholderTextColor="#4b5563"
            value={endDate}
            onChangeText={setEndDate}
            onFocus={() => setFocusedField('endDate')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Total Budget *</Text>
        <View style={styles.budgetRow}>
          <View style={styles.budgetInputCol}>
            <View
              style={[
                styles.inputWrap,
                focusedField === 'budget' && styles.inputWrapFocused,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="e.g. 2000"
                placeholderTextColor="#4b5563"
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
                onFocus={() => setFocusedField('budget')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>
          <View style={styles.currencyCol}>
            {currencies.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.currencyPill,
                  currency === c && styles.currencyPillActive,
                ]}
                onPress={() => setCurrency(c)}
              >
                <Text
                  style={[
                    styles.currencyPillText,
                    currency === c && styles.currencyPillTextActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>PREFERENCES</Text>
        <View style={styles.prefsGrid}>
          {preferences.map(pref => (
            <TouchableOpacity
              key={pref.id}
              style={[
                styles.prefBtn,
                selectedPrefs.includes(pref.id) && styles.prefBtnActive,
              ]}
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
      </View>

      <TouchableOpacity style={styles.button} onPress={handleGenerate} disabled={loading}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#ffffff" style={styles.loadingSpinner} />
            <Text style={styles.buttonTextLoading}>Generating your trip...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Generate My Trip</Text>
        )}
      </TouchableOpacity>

      {loading ? (
        <Text style={styles.loadingHint}>
          This may take 10-15 seconds. Please wait!
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    paddingTop: 48,
    gap: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 0,
  },
  backText: {
    color: '#6366f1',
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  header: {
    marginBottom: 0,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#4b5563',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 16,
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    width: '100%',
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#4b5563',
    textTransform: 'uppercase',
  },
  inputWrap: {
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 0,
    minHeight: 48,
    justifyContent: 'center',
  },
  inputWrapFocused: {
    borderColor: 'rgba(99,102,241,0.5)',
  },
  input: {
    backgroundColor: 'transparent',
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 14,
    paddingHorizontal: 0,
    margin: 0,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  budgetInputCol: {
    flex: 0.6,
    minWidth: 0,
  },
  currencyCol: {
    flex: 0.4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
  },
  currencyPill: {
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  currencyPillActive: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: '#6366f1',
  },
  currencyPillText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
  },
  currencyPillTextActive: {
    color: '#6366f1',
  },
  prefsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefBtn: {
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  prefBtnActive: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: '#6366f1',
  },
  prefText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  prefTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextLoading: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    marginRight: 10,
  },
  loadingHint: {
    fontSize: 12,
    color: '#4b5563',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
