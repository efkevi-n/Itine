import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BudgetTracker } from '@/components/BudgetTracker';
import { ServiceSwapCard } from '@/components/ServiceSwapCard';
import { useEditItinerary } from '@/hooks/useEditItinerary';

const BG = '#F8F8F6';
const TEXT = '#111827';
const GREEN = '#10B981';
const GREY = '#6B7280';

export default function EditItineraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const {
    services,
    totalCost,
    totalBudget,
    currency,
    overBudget,
    locked,
    loading,
    error,
    saving,
    regenerating,
    alternatives,
    loadingAltFor,
    currentDays,
    loadData,
    fetchAlternatives,
    handleSelectAlternative,
    handleSave,
    handleReset,
    handleRegenerate,
  } = useEditItinerary(tripId);

  const onResetConfirm = () => {
    Alert.alert(
      'Reset to AI suggestion',
      'Restore the original itinerary? Your changes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: handleReset },
      ],
    );
  };

  if (!tripId) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.errorText}>Missing trip ID.</Text>
      </View>
    );
  }
  if (loading && currentDays.length === 0 && !locked) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading itinerary...</Text>
      </View>
    );
  }
  if ((error && currentDays.length === 0) || locked) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <Feather name="lock" size={32} color={GREY} style={{ marginBottom: 12 }} />
        <Text style={styles.errorText}>
          {error ?? 'This trip has been booked and can no longer be edited.'}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()} activeOpacity={0.9}>
          <Text style={styles.retryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Feather name="chevron-left" size={20} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit itinerary</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <BudgetTracker totalCost={totalCost} totalBudget={totalBudget} currency={currency} />
        {overBudget ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              Over budget by {currency} {Math.round(totalCost - totalBudget)}
            </Text>
          </View>
        ) : null}
        {services.map((svc) => (
          <ServiceSwapCard
            key={svc.id}
            service={svc}
            alternatives={alternatives[svc.id] ?? []}
            onSelectAlternative={(opt) => handleSelectAlternative(svc.id, opt)}
            onSwapPress={() => fetchAlternatives(svc)}
            loading={loadingAltFor === svc.id}
          />
        ))}
        <TouchableOpacity
          style={[styles.primaryBtn, (saving || overBudget) && styles.btnDisabled]}
          onPress={() =>
            handleSave(() =>
              router.replace({ pathname: '/itinerary-review', params: { tripId } }),
            )
          }
          disabled={saving || overBudget}
          activeOpacity={0.92}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Save & Continue</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onResetConfirm} activeOpacity={0.88}>
          <Text style={styles.secondaryBtnText}>Reset to AI suggestion</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, regenerating && styles.btnDisabled]}
          onPress={handleRegenerate}
          disabled={regenerating}
          activeOpacity={0.88}
        >
          {regenerating ? (
            <ActivityIndicator color={GREEN} size="small" />
          ) : (
            <Text style={styles.secondaryBtnText}>Regenerate entire trip</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: BG,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
  },
  loadingText: { marginTop: 12, color: GREY, fontSize: 14 },
  errorText: { color: '#EF4444', textAlign: 'center', fontSize: 14, paddingHorizontal: 16 },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: GREEN,
    borderRadius: 20,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  warningBanner: {
    backgroundColor: 'rgba(250, 205, 61, 0.25)',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  warningText: { color: '#92400E', fontWeight: '600', textAlign: 'center', fontSize: 14 },
  primaryBtn: {
    backgroundColor: GREEN,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  secondaryBtnText: { color: GREEN, fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.7 },
});
