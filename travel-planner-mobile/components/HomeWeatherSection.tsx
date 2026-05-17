import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { TripCardData } from '@/components/TripCard';
import { theme } from '@/constants/theme';
import { type WeatherLoadState, getCity, weatherKey, formatTemperature, getWeatherIconUri } from '@/utils/homeHelpers';

interface Props {
  weatherTrips: TripCardData[];
  weatherByCity: Record<string, WeatherLoadState>;
}

export function HomeWeatherSection({ weatherTrips, weatherByCity }: Props) {
  if (weatherTrips.length === 0) {
    return (
      <View style={s.empty}>
        <Feather name="cloud-off" size={17} color={theme.colors.subtext} />
        <Text style={s.emptyText}>Weather cards appear when you have an upcoming trip.</Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {weatherTrips.map((trip) => {
        const city = getCity(trip.destination);
        const weather = weatherByCity[weatherKey(city)];
        const iconUri = weather?.status === 'ready' ? getWeatherIconUri(weather.data.icon) : undefined;
        return (
          <View key={`w-${trip.id}`} style={s.card}>
            <View style={s.iconWrap}>
              {weather?.status === 'loading' ? (
                <ActivityIndicator color={theme.colors.primary} size="small" />
              ) : iconUri ? (
                <Image source={{ uri: iconUri }} style={s.img} />
              ) : (
                <Feather name="cloud-off" size={17} color={theme.colors.subtext} />
              )}
            </View>
            <Text style={s.city} numberOfLines={1}>{city}</Text>
            <Text style={s.temp}>
              {weather?.status === 'ready'
                ? formatTemperature(weather.data.temperature)
                : weather?.status === 'loading' ? 'Loading…' : 'Unavailable'}
            </Text>
            <Text style={s.hint} numberOfLines={2}>
              {weather?.status === 'ready'
                ? `${weather.data.condition} / ${weather.data.humidity}% humidity`
                : 'Connect for weather data'}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { gap: 12, paddingBottom: 22, paddingRight: 4 },
  card: {
    width: 160, backgroundColor: theme.colors.card, borderColor: theme.colors.border,
    borderRadius: 18, borderWidth: 1, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  img: { width: 32, height: 32 },
  city: { color: theme.colors.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  temp: { color: theme.colors.subtext, fontSize: 13, fontWeight: '700' },
  hint: { color: theme.colors.subtext, fontSize: 11, fontWeight: '500', marginTop: 4, lineHeight: 16 },
  empty: {
    alignItems: 'center', backgroundColor: theme.colors.card, borderColor: theme.colors.border,
    borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 22, padding: 14,
  },
  emptyText: { color: theme.colors.subtext, flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },
});
