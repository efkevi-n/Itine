import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { BudgetCategory } from '@/types/budget';
import { theme } from '@/constants/theme';

interface BudgetCategoryTableProps {
  categories: BudgetCategory[];
  currency: string;
  totalBudget: number;
}

/** Per-category budget (equal split of totalBudget). Difference = allocated - budget. */
function categoryBudget(totalBudget: number, categoryCount: number): number {
  return categoryCount > 0 ? totalBudget / categoryCount : 0;
}

export function BudgetCategoryTable({
  categories,
  currency,
  totalBudget,
}: BudgetCategoryTableProps) {
  const count = categories.length || 1;
  const perCategory = categoryBudget(totalBudget, count);
  const format = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <View style={styles.table}>
      <Text style={styles.sectionTitle}>Category breakdown</Text>
      {categories.map((cat) => {
        const diff = cat.allocated - perCategory;
        const isOver = diff > 0;
        const isUnder = diff < 0;
        return (
          <View key={cat.key} style={styles.row}>
            <View style={styles.cellLabel}>
              <Text style={styles.icon}>{cat.icon}</Text>
              <Text style={styles.name}>{cat.label}</Text>
            </View>
            <Text style={styles.allocated}>
              {currency} {format(cat.allocated)}
            </Text>
            <Text
              style={[
                styles.diff,
                isOver ? styles.diffOver : isUnder ? styles.diffUnder : styles.diffNeutral,
              ]}
            >
              {isOver ? '+' : ''}{currency} {format(diff)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.radius.md,
  },
  sectionTitle: {
    fontSize: theme.fonts.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.radius.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  cellLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: theme.fonts.medium,
  },
  name: {
    fontSize: theme.fonts.regular,
    color: theme.colors.text,
  },
  allocated: {
    fontSize: theme.fonts.regular,
    color: theme.colors.text,
    marginRight: 12,
    minWidth: 72,
    textAlign: 'right',
  },
  diff: {
    fontSize: theme.fonts.regular,
    fontWeight: '600',
    minWidth: 64,
    textAlign: 'right',
  },
  diffUnder: {
    color: theme.colors.success,
  },
  diffOver: {
    color: theme.colors.error,
  },
  diffNeutral: {
    color: theme.colors.subtext,
  },
});
