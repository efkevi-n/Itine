import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateYYYYMMDD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateDisplay(isoString: string): string {
  const d = parseDate(isoString);
  if (!d) return '';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
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
  const [pickerField, setPickerField] = useState<'startDate' | 'endDate' | null>(null);
  const [pickerValue, setPickerValue] = useState<Date>(new Date());
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
  }, [fadeAnim]);

  const togglePref = (id: string) => {
    if (loading) return;
    setSelectedPrefs(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      const preferencesObj = preferences.reduce<Record<string, boolean>>((acc, pref) => {
        acc[pref.id] = selectedPrefs.includes(pref.id);
        return acc;
      }, {});

      const createRes = await api.post<{ id?: string; data?: { id?: string } }>('/trips', {
        destination: destination.trim(),
        origin: origin.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        budget: Number(budget),
        currency: currency,
        preferences: preferencesObj,
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
    } catch (err: any) {
      console.log('TRIP ERROR:', JSON.stringify(err?.response?.data, null, 2));
      console.log('STATUS:', err?.response?.status);
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openDatePicker = (field: 'startDate' | 'endDate') => {
    if (disabled) return;
    setError('');

    const current =
      field === 'startDate'
        ? parseDate(startDate) ?? today
        : parseDate(endDate) ?? parseDate(startDate) ?? today;

    setPickerValue(current);
    setPickerField(field);
  };

  const commitPickedDate = (field: 'startDate' | 'endDate', d: Date) => {
    const next = formatDateYYYYMMDD(d);
    if (field === 'startDate') {
      setStartDate(next);
      const end = parseDate(endDate);
      if (end && end <= d) setEndDate('');
      return;
    }
    setEndDate(next);
  };

  const minimumForField = (field: 'startDate' | 'endDate'): Date => {
    if (field === 'startDate') return today;
    const start = parseDate(startDate);
    if (!start) return today;
    const min = new Date(start);
    min.setDate(min.getDate() + 1);
    return min;
  };

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
              <TouchableOpacity style={styles.backBtn} onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }} disabled={disabled}>
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
                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={disabled}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    openDatePicker('startDate');
                  }}
                  style={[styles.input, styles.dateInput, inputBorder('startDate')]}
                  onFocus={() => setFocusedField('startDate')}
                  onBlur={() => setFocusedField(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Pick start date"
                >
                  <Text style={[styles.dateText, !startDate && styles.datePlaceholder]}>
                    {startDate ? formatDateDisplay(startDate) : 'Pick a date'}
                  </Text>
                  <Feather name="calendar" size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>END DATE</Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={disabled}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    openDatePicker('endDate');
                  }}
                  style={[styles.input, styles.dateInput, inputBorder('endDate')]}
                  onFocus={() => setFocusedField('endDate')}
                  onBlur={() => setFocusedField(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Pick end date"
                >
                  <Text style={[styles.dateText, !endDate && styles.datePlaceholder]}>
                    {endDate ? formatDateDisplay(endDate) : 'Pick a date'}
                  </Text>
                  <Feather name="calendar" size={18} color="#9ca3af" />
                </TouchableOpacity>
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

      <Modal
        visible={pickerField !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerField(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setPickerField(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.pickerCard} onPress={() => {}}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {pickerField === 'startDate' ? 'Select start date' : 'Select end date'}
              </Text>
              <TouchableOpacity onPress={() => setPickerField(null)} accessibilityRole="button" accessibilityLabel="Close date picker">
                <Feather name="x" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {pickerField ? (
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={minimumForField(pickerField)}
                onChange={(_: DateTimePickerEvent, d?: Date) => {
                  if (!d) return;
                  setPickerValue(d);
                }}
              />
            ) : null}

            <View style={styles.pickerActions}>
              <TouchableOpacity
                style={styles.pickerBtnGhost}
                onPress={() => setPickerField(null)}
              >
                <Text style={styles.pickerBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pickerBtnPrimary}
                onPress={() => {
                  if (!pickerField) return;
                  commitPickedDate(pickerField, pickerValue);
                  setPickerField(null);
                }}
              >
                <Text style={styles.pickerBtnPrimaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: { color: '#ffffff', fontSize: 15 },
  datePlaceholder: { color: '#4b5563' },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 24,
    justifyContent: 'center',
  },
  pickerCard: {
    backgroundColor: '#13131f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 14,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pickerTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  pickerBtnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pickerBtnGhostText: { color: '#9ca3af', fontWeight: '700' },
  pickerBtnPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#6366f1',
  },
  pickerBtnPrimaryText: { color: '#ffffff', fontWeight: '800' },
});
