import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { BudgetCategory } from '@/types/budget';
import { theme } from '@/constants/theme';

const SIZE = 220;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 85;
const INNER_R = 46;

interface BudgetPieChartProps {
  categories: BudgetCategory[];
  totalAllocated: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(startAngle: number, endAngle: number): string {
  const outerStart = polarToCartesian(CX, CY, R, startAngle);
  const outerEnd = polarToCartesian(CX, CY, R, endAngle);
  const innerStart = polarToCartesian(CX, CY, INNER_R, startAngle);
  const innerEnd = polarToCartesian(CX, CY, INNER_R, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${R} ${R} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

export function BudgetPieChart({ categories, totalAllocated }: BudgetPieChartProps) {
  const slices = categories.filter((c) => c.allocated > 0);

  if (slices.length === 0) {
    return (
      <View style={[styles.wrapper, styles.placeholder]}>
        <Text style={styles.placeholderText}>No allocation data</Text>
      </View>
    );
  }

  const total = slices.reduce((sum, c) => sum + c.allocated, 0);
  let cursor = 0;

  return (
    <View style={styles.chartSection}>
      <Svg width={SIZE} height={SIZE} style={styles.svg}>
        {slices.map((c) => {
          const sweep = (c.allocated / total) * 360;
          const start = cursor;
          const end = cursor + sweep - 1;
          cursor += sweep;
          return (
            <Path
              key={c.label}
              d={slicePath(start, end)}
              fill={c.color}
            />
          );
        })}
        <Circle cx={CX} cy={CY} r={INNER_R} fill={theme.colors.background} />
      </Svg>

      <View style={styles.legend}>
        {slices.map((c) => {
          const pct = totalAllocated > 0 ? Math.round((c.allocated / totalAllocated) * 100) : 0;
          return (
            <View key={c.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: c.color }]} />
              <Text style={styles.legendText}>{c.label} — {pct}%</Text>
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
    alignItems: 'center',
  },
  svg: {
    alignSelf: 'center',
  },
  wrapper: {
    height: SIZE,
    width: SIZE,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    marginTop: theme.radius.md,
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
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
