import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import type { EditableService, SwapOption } from '@/types/editItinerary';
import { AlternativeOption } from '@/components/AlternativeOption';
import { theme } from '@/constants/theme';

const TYPE_LABELS: Record<EditableService['type'], string> = {
  flight: '✈️ Flight',
  hotel: '🏨 Hotel',
  transport: '🚕 Transport',
  activity: '🎭 Activity',
};

interface ServiceSwapCardProps {
  service: EditableService;
  alternatives: SwapOption[];
  onSelectAlternative: (option: SwapOption) => void;
  onSwapPress?: () => void;
  loading?: boolean;
}

export function ServiceSwapCard({
  service,
  alternatives,
  onSelectAlternative,
  onSwapPress,
  loading = false,
}: ServiceSwapCardProps) {
  const [expanded, setExpanded] = useState(false);
  const typeLabel = TYPE_LABELS[service.type] ?? service.type;
  const onSwap = () => {
    onSwapPress?.();
    setExpanded((e) => !e);
  };
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.typeLabel}>{typeLabel}</Text>
          <Text style={styles.provider} numberOfLines={1}>
            {service.provider}
          </Text>
          <Text style={styles.cost}>${Math.round(service.cost)}</Text>
        </View>
        <TouchableOpacity
          style={styles.swapBtn}
          onPress={onSwap}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <Text style={styles.swapBtnText}>Swap</Text>
          )}
        </TouchableOpacity>
      </View>
      {expanded && alternatives.length > 0 ? (
        <View style={styles.alternatives}>
          <Text style={styles.altTitle}>Alternatives</Text>
          {alternatives.map((opt) => (
            <AlternativeOption
              key={opt.id}
              option={opt}
              onSelect={() => {
                onSelectAlternative(opt);
                setExpanded(false);
              }}
            />
          ))}
        </View>
      ) : null}
      {expanded && alternatives.length === 0 && !loading ? (
        <Text style={styles.noAlt}>No alternatives found</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.radius.md,
    marginBottom: theme.radius.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: { flex: 1 },
  typeLabel: {
    fontSize: theme.fonts.regular,
    color: theme.colors.subtext,
    marginBottom: 2,
  },
  provider: {
    fontSize: theme.fonts.medium,
    color: theme.colors.text,
    fontWeight: '600',
  },
  cost: { fontSize: theme.fonts.regular, color: theme.colors.success, marginTop: 4 },
  swapBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.radius.md,
    paddingVertical: theme.radius.sm,
    borderRadius: theme.radius.sm,
    minWidth: 72,
    alignItems: 'center',
  },
  swapBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: theme.fonts.regular },
  alternatives: { marginTop: theme.radius.md, paddingTop: theme.radius.sm, borderTopWidth: 1, borderTopColor: theme.colors.background },
  altTitle: { fontSize: theme.fonts.regular, color: theme.colors.subtext, marginBottom: 8 },
  noAlt: { marginTop: theme.radius.sm, fontSize: theme.fonts.regular, color: theme.colors.subtext },
});
