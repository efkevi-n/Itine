import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';

export interface HotelBookingData {
  imageUrl: string;
  hotelName: string;
  location: string;
  checkIn: string;
  checkOut: string;
  nights: string;
  rating: string;
  price: string;
  status: string;
  latitude?: number;
  longitude?: number;
}

type Mode = 'light' | 'dark';

interface HotelBookingCardProps {
  hotel: HotelBookingData;
  mode: Mode;
}

const palette = {
  light: {
    card: '#ffffff',
    text: '#111827',
    muted: '#64748b',
    border: 'rgba(15,23,42,0.08)',
    soft: '#f8fafc',
    accent: '#0f766e',
    successBg: 'rgba(20,184,166,0.12)',
    shadow: '#94a3b8',
  },
  dark: {
    card: '#161b28',
    text: '#f8fafc',
    muted: '#94a3b8',
    border: 'rgba(255,255,255,0.08)',
    soft: 'rgba(255,255,255,0.05)',
    accent: '#5eead4',
    successBg: 'rgba(45,212,191,0.14)',
    shadow: '#020617',
  },
};

function StayDetail({ label, value, mode }: { label: string; value: string; mode: Mode }) {
  const colors = palette[mode];
  return (
    <View style={styles.stayDetail}>
      <Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function HotelBookingCard({ hotel, mode }: HotelBookingCardProps) {
  const colors = palette[mode];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <Image source={{ uri: hotel.imageUrl }} style={styles.image} contentFit="cover" transition={180} />
      <View style={styles.copy}>
        <View style={styles.header}>
          <View style={styles.hotelTitle}>
            <Text style={[styles.label, { color: colors.muted }]}>HOTEL BOOKING</Text>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
              {hotel.hotelName}
            </Text>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={13} color={colors.muted} />
              <Text style={[styles.location, { color: colors.muted }]} numberOfLines={1}>
                {hotel.location}
              </Text>
            </View>
          </View>
          <View style={[styles.rating, { backgroundColor: colors.soft, borderColor: colors.border }]}>
            <Feather name="star" size={13} color="#f59e0b" />
            <Text style={[styles.ratingText, { color: colors.text }]}>{hotel.rating}</Text>
          </View>
        </View>

        <View style={[styles.details, { borderColor: colors.border }]}>
          <StayDetail label="CHECK-IN" value={hotel.checkIn} mode={mode} />
          <StayDetail label="CHECK-OUT" value={hotel.checkOut} mode={mode} />
          <StayDetail label="NIGHTS" value={hotel.nights} mode={mode} />
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>TOTAL</Text>
            <Text style={[styles.price, { color: colors.text }]}>{hotel.price}</Text>
          </View>
          <View style={[styles.status, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.statusText, { color: colors.accent }]}>{hotel.status}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    elevation: 7,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
  },
  image: {
    height: 168,
    width: '100%',
  },
  copy: { gap: 18, padding: 18 },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  hotelTitle: { flex: 1 },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  location: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  rating: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
  },
  details: {
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 16,
  },
  stayDetail: { flex: 1 },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 20,
    fontWeight: '900',
  },
  status: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
