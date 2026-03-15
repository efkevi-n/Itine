import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { exceedsBudget } from '@/utils/editItinerary';
import { OVER_BUDGET_WARNING_PREFIX } from '@/constants/editItinerary';

interface BudgetTrackerProps {
  totalCost: number;
  totalBudget: number;
  currency: string;
}

function formatAmount(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function BudgetTracker({
  totalCost,
  totalBudget,
  currency,
}: BudgetTrackerProps) {
  const over = exceedsBudget(totalCost, totalBudget);
  const ratio = totalBudget > 0 ? Math.min(totalCost / totalBudget, 1.5) : 0;
  const barColor = over ? theme.colors.error : theme.colors.success;
  const overAmount = over ? totalCost - totalBudget : 0;
  return (
    <View style={styles.wrapper}>
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(ratio * 100, 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>
          {currency} {formatAmount(totalCost)} / {formatAmount(totalBudget)}
        </Text>
        {over ? (
          <Text style={styles.warning}>
            ⚠️ {OVER_BUDGET_WARNING_PREFIX} {currency} {formatAmount(overAmount)}
          </Text>
        ) : (
          <Text style={styles.remaining}>
            {currency} {formatAmount(totalBudget - totalCost)} left
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: theme.radius.md },
  barBg: {
    height: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: { height: '100%', borderRadius: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: theme.fonts.regular, color: theme.colors.subtext },
  warning: { fontSize: theme.fonts.regular, color: theme.colors.error, fontWeight: '600' },
  remaining: { fontSize: theme.fonts.regular, color: theme.colors.success },
});
