import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Pie, PolarChart } from 'victory-native';
import type { BudgetCategory } from '@/types/budget';
import { theme } from '@/constants/theme';

const CHART_SIZE = 220;

interface BudgetPieChartProps {
  categories: BudgetCategory[];
  totalAllocated: number;
}

function buildChartData(categories: BudgetCategory[], totalAllocated: number) {
  return categories
    .filter((c) => c.allocated > 0 || totalAllocated === 0)
    .map((c) => ({
      label: c.label,
      value: c.allocated > 0 ? c.allocated : 1,
      color: c.color,
    }));
}

export function BudgetPieChart({ categories, totalAllocated }: BudgetPieChartProps) {
  const data = buildChartData(categories, totalAllocated);
  if (data.length === 0) {
    return (
      <View style={[styles.wrapper, styles.placeholder]}>
        <Text style={styles.placeholderText}>No allocation data</Text>
      </View>
    );
  }
  return (
    <View style={styles.chartSection}>
      <View style={styles.wrapper}>
        <PolarChart
          data={data}
          labelKey="label"
          valueKey="value"
          colorKey="color"
        >
          <Pie.Chart />
        </PolarChart>
      </View>
      <View style={styles.legend}>
        {data.map((d) => {
          const pct =
            totalAllocated > 0 ? Math.round((d.value / totalAllocated) * 100) : 0;
          return (
            <View key={d.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: d.color }]} />
              <Text style={styles.legendText}>{d.label} — {pct}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartSection: {
    marginVertical: theme.radius.lg,
  },
  wrapper: {
    height: CHART_SIZE,
    width: CHART_SIZE,
    alignSelf: 'center',
  },
  legend: {
    marginTop: theme.radius.md,
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: theme.fonts.regular,
    color: theme.colors.text,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: theme.fonts.regular,
    color: theme.colors.subtext,
  },
});
