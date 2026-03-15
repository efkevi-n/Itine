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
import { BudgetTracker } from '@/components/BudgetTracker';
import { ServiceSwapCard } from '@/components/ServiceSwapCard';
import { useEditItinerary } from '@/hooks/useEditItinerary';
import { theme } from '@/constants/theme';

export default function EditItineraryScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const {
    services,
    totalCost,
    totalBudget,
    currency,
    overBudget,
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
      ]
    );
  };

  if (!tripId) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Missing trip ID.</Text>
      </View>
    );
  }
  if (loading && currentDays.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading itinerary...</Text>
      </View>
    );
  }
  if (error && currentDays.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>✏️ Edit itinerary</Text>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <BudgetTracker totalCost={totalCost} totalBudget={totalBudget} currency={currency} />
      {overBudget ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Over budget by {currency} {Math.round(totalCost - totalBudget)}
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
        style={[styles.primaryBtn, saving && styles.btnDisabled]}
        onPress={() => handleSave(() => router.replace({ pathname: '/itinerary-review', params: { tripId } }))}
        disabled={saving || overBudget}
      >
        {saving ? (
          <ActivityIndicator color={theme.colors.background} size="small" />
        ) : (
          <Text style={styles.primaryBtnText}>Save & Continue</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={onResetConfirm}>
        <Text style={styles.secondaryBtnText}>Reset to AI suggestion</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryBtn, regenerating && styles.btnDisabled]}
        onPress={handleRegenerate}
        disabled={regenerating}
      >
        {regenerating ? (
          <ActivityIndicator color={theme.colors.primary} size="small" />
        ) : (
          <Text style={styles.secondaryBtnText}>Regenerate entire trip</Text>
        )}
      </TouchableOpacity>
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  backBtn: { marginTop: 60, marginBottom: 16 },
  backText: { color: theme.colors.primary, fontSize: 16 },
  title: { fontSize: theme.fonts.title, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  loadingText: { marginTop: 12, color: theme.colors.subtext },
  errorText: { color: theme.colors.error, textAlign: 'center' },
  errorBox: { backgroundColor: theme.colors.error + '22', padding: 12, borderRadius: theme.radius.md, marginBottom: 16 },
  retryBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
  retryBtnText: { color: theme.colors.background, fontWeight: 'bold' },
  warningBanner: { backgroundColor: theme.colors.warning + '33', padding: 12, borderRadius: theme.radius.md, marginBottom: 16 },
  warningText: { color: theme.colors.warning, fontWeight: '600', textAlign: 'center' },
  primaryBtn: { backgroundColor: theme.colors.success, padding: 16, borderRadius: theme.radius.md, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 16 },
  secondaryBtn: { backgroundColor: theme.colors.card, padding: 16, borderRadius: theme.radius.md, alignItems: 'center', marginBottom: 12 },
  secondaryBtnText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 },
  btnDisabled: { opacity: 0.7 },
  spacer: { height: 40 },
});
