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
      <View style={styles.typeBanner}>
        <Text style={styles.typeBannerText}>{typeLabel}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.provider} numberOfLines={1}>
              {service.provider}
            </Text>
            <Text style={styles.cost}>${Math.round(service.cost)}</Text>
          </View>
          <TouchableOpacity style={styles.swapBtn} onPress={onSwap} disabled={loading}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  typeBanner: {
    backgroundColor: theme.colors.divider,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  typeBannerText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  body: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1, marginRight: 12 },
  provider: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  cost: { fontSize: 14, color: theme.colors.primary, marginTop: 4, fontWeight: '700' },
  swapBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    minWidth: 64,
    alignItems: 'center',
  },
  swapBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 14 },
  alternatives: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.divider },
  altTitle: { fontSize: 12, color: theme.colors.subtext, marginBottom: 8 },
  noAlt: { fontSize: 13, color: theme.colors.subtext, marginTop: 8 },
});
