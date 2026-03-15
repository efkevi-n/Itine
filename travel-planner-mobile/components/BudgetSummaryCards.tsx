import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface BudgetSummaryCardsProps {
  totalBudget: number;
  totalAllocated: number;
  currency: string;
}

export function BudgetSummaryCards({
  totalBudget,
  totalAllocated,
  currency,
}: BudgetSummaryCardsProps) {
  const remaining = totalBudget - totalAllocated;
  const isOver = remaining < 0;
  const format = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total budget</Text>
        <Text style={styles.cardValue}>
          {currency} {format(totalBudget)}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total allocated</Text>
        <Text style={styles.cardValue}>
          {currency} {format(totalAllocated)}
        </Text>
      </View>
      <View style={[styles.card, isOver ? styles.cardNegative : styles.cardPositive]}>
        <Text style={styles.cardLabel}>Remaining</Text>
        <Text style={[styles.cardValue, isOver ? styles.valueNegative : styles.valuePositive]}>
          {currency} {format(remaining)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.radius.md,
    marginBottom: theme.radius.lg,
  },
  card: {
    flex: 1,
    minWidth: 90,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.radius.md,
  },
  cardPositive: {},
  cardNegative: {},
  cardLabel: {
    fontSize: theme.fonts.regular,
    color: theme.colors.subtext,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: theme.fonts.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  valuePositive: {
    color: theme.colors.success,
  },
  valueNegative: {
    color: theme.colors.error,
  },
});
