import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { itineraryApi } from '@/api/itinerary';
import { getErrorMessage } from '@/utils/errorHandler';
import { tripsApi } from '@/api/trips';
import { BudgetPieChart } from '@/components/BudgetPieChart';
import { BudgetSummaryCards } from '@/components/BudgetSummaryCards';
import { BudgetCategoryTable } from '@/components/BudgetCategoryTable';
import { mapCostBreakdownToView } from '@/utils/budgetBreakdown';
import type { BudgetBreakdownView } from '@/types/budget';

const BG = '#F8F8F6';
const TEXT = '#111827';
const GREEN = '#10B981';
const GREY = '#6B7280';

function parseBudget(trip: Record<string, unknown>): number {
  const v = trip.totalBudget ?? trip.total_budget;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

export default function BudgetBreakdownScreen() {
  const router = useRouter();
  const { top, stackScrollBottomCompact: scrollBottom } = useScreenInsets();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const [data, setData] = useState<BudgetBreakdownView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!tripId) {
      router.replace('/(tabs)');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const [tripRes, breakdownRes] = await Promise.all([
        tripsApi.getById(tripId),
        itineraryApi.getCostBreakdown(tripId),
      ]);
      const tripRaw = tripRes.data as Record<string, unknown>;
      if (!tripRaw || typeof tripRaw !== 'object') {
        setError('Trip not found.');
        setLoading(false);
        return;
      }
      const totalBudget = parseBudget(tripRaw);
      const currency = String(tripRaw.currency ?? 'USD');
      const breakdownRaw = breakdownRes.data as Record<string, unknown>;
      const breakdownList = Array.isArray(breakdownRaw?.breakdown)
        ? (breakdownRaw.breakdown as Parameters<typeof mapCostBreakdownToView>[0])
        : undefined;
      setData(mapCostBreakdownToView(breakdownList, totalBudget, currency));
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to load budget.');
    } finally {
      setLoading(false);
    }
  }, [tripId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!tripId) return null;

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: top }]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading budget...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: top }]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData} activeOpacity={0.9}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLinkBtn} activeOpacity={0.7}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Feather name="chevron-left" size={20} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budget breakdown</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Cost allocation by category</Text>
        <BudgetPieChart categories={data.categories} totalAllocated={data.totalAllocated} />
        <BudgetSummaryCards
          totalBudget={data.totalBudget}
          totalAllocated={data.totalAllocated}
          currency={data.currency}
        />
        <BudgetCategoryTable
          categories={data.categories}
          currency={data.currency}
          totalBudget={data.totalBudget}
        />
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
  subtitle: {
    fontSize: 14,
    color: GREY,
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingText: { color: GREY, marginTop: 12, fontSize: 14 },
  errorText: { color: '#EF4444', textAlign: 'center', marginBottom: 16, fontSize: 14 },
  retryBtn: {
    backgroundColor: GREEN,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 12,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  backLinkBtn: { paddingVertical: 8 },
  backLink: { color: GREY, fontSize: 14, fontWeight: '600' },
});
