import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { LiveTripStop } from '@/types/liveTrip';
import { MAPS_QUERY_URL } from '@/constants/activeTrip';

const BG = '#F8F8F6';
const TEXT = '#111827';
const GREEN = '#10B981';
const GREY = '#6B7280';
const BLUE = '#3B82F6';

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 10,
  elevation: 2,
};

interface LiveStopCardProps {
  stop: LiveTripStop;
  isNext?: boolean;
  showQrPass?: boolean;
  onQrPass?: () => void;
}

export function LiveStopCard({ stop, isNext, showQrPass, onQrPass }: LiveStopCardProps) {
  const [expanded, setExpanded] = useState(false);
  const dotColor =
    stop.kind === 'flight' ? GREEN : stop.kind === 'hotel' ? BLUE : GREY;
  const icon: keyof typeof Feather.glyphMap =
    stop.kind === 'flight'
      ? 'navigation'
      : stop.kind === 'hotel'
        ? 'home'
        : stop.kind === 'transport'
          ? 'truck'
          : 'map-pin';
  const mapsQuery = stop.address || stop.title;

  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineDot, { backgroundColor: dotColor }]}>
        <Feather name={icon} size={10} color="#fff" />
      </View>

      <TouchableOpacity
        style={[
          styles.timelineCard,
          CARD_SHADOW,
          isNext && styles.timelineCardNext,
        ]}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.88}
      >
        {isNext ? (
          <View style={styles.nextRow}>
            <View style={styles.nextDot} />
            <Text style={styles.nextLabel}>Up next</Text>
          </View>
        ) : null}

        <View style={styles.timelineCardTop}>
          <View style={styles.timelineCardLeft}>
            {stop.time ? <Text style={styles.timelineTime}>{stop.time}</Text> : null}
            <Text style={styles.timelineTitle}>{stop.title}</Text>
          </View>
          {stop.status ? (
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedText}>{stop.status}</Text>
            </View>
          ) : null}
        </View>

        {stop.subtitle ? <Text style={styles.timelineSubtitle}>{stop.subtitle}</Text> : null}
        {stop.address ? <Text style={styles.timelineAddress}>{stop.address}</Text> : null}
        {stop.cost ? <Text style={styles.timelineCost}>{stop.cost}</Text> : null}

        {expanded && stop.details.length > 0 ? (
          <View style={styles.details}>
            {stop.details.map((row) => (
              <View key={`${row.label}-${row.value}`} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          {stop.kind === 'flight' && showQrPass && onQrPass ? (
            <TouchableOpacity style={styles.boardingBtn} onPress={onQrPass} activeOpacity={0.85}>
              <Text style={styles.boardingBtnText}>Boarding Pass</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.mapsBtn}
            onPress={() => Linking.openURL(MAPS_QUERY_URL + encodeURIComponent(mapsQuery))}
            activeOpacity={0.85}
          >
            <Feather name="map" size={12} color={GREEN} />
            <Text style={styles.mapsBtnText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  timelineItem: { position: 'relative', paddingLeft: 32, marginBottom: 0 },
  timelineDot: {
    position: 'absolute',
    left: -5,
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: BG,
    zIndex: 2,
  },
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  timelineCardNext: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderWidth: 1.5,
  },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  nextDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  nextLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  timelineCardLeft: { flex: 1 },
  timelineTime: {
    fontSize: 10,
    fontWeight: '700',
    color: GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timelineTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginTop: 2 },
  confirmedBadge: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confirmedText: { fontSize: 10, fontWeight: '700', color: GREEN },
  timelineSubtitle: { fontSize: 12, color: GREY, marginBottom: 4 },
  timelineAddress: { fontSize: 12, color: GREY, lineHeight: 18, marginBottom: 4 },
  timelineCost: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 8 },
  details: {
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: { flex: 1, fontSize: 12, color: TEXT, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  boardingBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  boardingBtnText: { fontSize: 10, fontWeight: '700', color: TEXT },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  mapsBtnText: { fontSize: 10, fontWeight: '700', color: GREEN },
});
