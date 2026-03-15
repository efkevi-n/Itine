import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { SwapOption } from '@/types/editItinerary';
import { formatPriceDiff } from '@/utils/editItinerary';
import { theme } from '@/constants/theme';

interface AlternativeOptionProps {
  option: SwapOption;
  onSelect: () => void;
}

export function AlternativeOption({ option, onSelect }: AlternativeOptionProps) {
  const { text, isCheaper } = formatPriceDiff(option.priceDifference);
  const diffColor = isCheaper ? theme.colors.success : theme.colors.error;
  return (
    <TouchableOpacity style={styles.row} onPress={onSelect} activeOpacity={0.7}>
      <Text style={styles.provider} numberOfLines={1}>
        {option.provider}
      </Text>
      <View style={styles.right}>
        <Text style={styles.cost}>${Math.round(option.cost)}</Text>
        <View style={[styles.badge, { backgroundColor: diffColor }]}>
          <Text style={styles.badgeText}>{text}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.radius.sm,
    paddingHorizontal: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.sm,
    marginBottom: 4,
  },
  provider: {
    flex: 1,
    fontSize: theme.fonts.regular,
    color: theme.colors.text,
    marginRight: theme.radius.sm,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: theme.radius.sm },
  cost: {
    fontSize: theme.fonts.regular,
    color: theme.colors.subtext,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  badgeText: {
    fontSize: theme.fonts.regular,
    color: theme.colors.background,
    fontWeight: 'bold',
  },
});
