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
import { itineraryApi } from '@/api/itinerary';
import { getErrorMessage } from '@/utils/errorHandler';
import { tripsApi } from '@/api/trips';
import { BudgetPieChart } from '@/components/BudgetPieChart';
import { BudgetSummaryCards } from '@/components/BudgetSummaryCards';
import { BudgetCategoryTable } from '@/components/BudgetCategoryTable';
import { parseCostBreakdownPayload } from '@/utils/budgetBreakdown';
import type { BudgetBreakdownView } from '@/types/budget';
import { theme } from '@/constants/theme';

function parseBudget(trip: Record<string, unknown>): number {
  const v = trip.totalBudget ?? trip.total_budget;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

function normalizeTripId(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

function getHttpStatus(e: unknown): number | undefined {
  return (e as { response?: { status?: number } })?.response?.status;
}

export default function BudgetBreakdownScreen() {
  const router = useRouter();
  const { tripId: tripIdParam, totalBudget: budgetParam, currency: currencyParam } =
    useLocalSearchParams<{ tripId?: string | string[]; totalBudget?: string; currency?: string }>();
  const tripId = normalizeTripId(tripIdParam);
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
      let totalBudget: number;
      let currency: string;

      if (budgetParam !== undefined && currencyParam !== undefined) {
        totalBudget = parseFloat(budgetParam) || 0;
        currency = currencyParam;
      } else {
        const tripRes = await tripsApi.getById(tripId);
        const tripRaw = tripRes.data as Record<string, unknown>;
        if (!tripRaw || typeof tripRaw !== 'object') {
          setError('Trip not found.');
          return;
        }
        totalBudget = parseBudget(tripRaw);
        currency = String(tripRaw.currency ?? 'USD');
      }

      let breakdownRes;
      try {
        breakdownRes = await itineraryApi.getCostBreakdown(tripId);
      } catch (e: unknown) {
        if (getHttpStatus(e) === 404) {
          setError(
            'Cost breakdown is not available yet. Finish itinerary generation first.',
          );
          return;
        }
        throw e;
      }

      const parsed = parseCostBreakdownPayload(breakdownRes.data, totalBudget, currency);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      setData(parsed.view);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to load budget.');
    } finally {
      setLoading(false);
    }
  }, [tripId, router, budgetParam, currencyParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!tripId) return null;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading budget...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Budget breakdown</Text>
      <Text style={styles.subtitle}>Cost allocation by category</Text>
      <BudgetPieChart
        categories={data.categories}
        totalAllocated={data.totalAllocated}
      />
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
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: { marginTop: 60, marginBottom: 16 },
  backText: { color: theme.colors.primary, fontSize: 16 },
  title: {
    fontSize: theme.fonts.title,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: theme.fonts.regular,
    color: theme.colors.subtext,
    marginBottom: 8,
  },
  loadingText: { color: theme.colors.subtext, marginTop: 12 },
  errorText: { color: theme.colors.error, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.radius.md,
    marginBottom: 12,
  },
  retryBtnText: { color: theme.colors.text, fontWeight: 'bold', fontSize: 16 },
  backLink: { color: theme.colors.subtext, fontSize: 14 },
  spacer: { height: 40 },
});
