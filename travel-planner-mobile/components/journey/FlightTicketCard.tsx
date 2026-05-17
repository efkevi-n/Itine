import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface FlightTicketData {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  departureCity: string;
  arrivalAirport: string;
  arrivalCity: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  seat: string;
  gate: string;
  bookingReference: string;
  passengerName: string;
  ticketPrice: string;
  status: string;
  origin?: string;
  departure?: string;
  from?: string;
  originCity?: string;
  originAirport?: string;
  fromAirport?: string;
}

type Mode = 'light' | 'dark';

interface FlightTicketCardProps {
  flight: FlightTicketData;
  mode: Mode;
}

const palette = {
  light: {
    card: '#ffffff',
    text: '#101827',
    muted: '#64748b',
    faint: '#e2e8f0',
    soft: '#f8fafc',
    accent: '#2563eb',
    accentSoft: 'rgba(37,99,235,0.1)',
    success: '#16a34a',
    shadow: '#94a3b8',
  },
  dark: {
    card: '#161b28',
    text: '#f8fafc',
    muted: '#94a3b8',
    faint: 'rgba(255,255,255,0.12)',
    soft: 'rgba(255,255,255,0.045)',
    accent: '#8b9cff',
    accentSoft: 'rgba(139,156,255,0.14)',
    success: '#86efac',
    shadow: '#020617',
  },
};

const CITY_AIRPORTS: Record<string, string> = {
  ankara: 'ESB',
  istanbul: 'IST',
  berlin: 'BER',
  rome: 'FCO',
  paris: 'CDG',
  tokyo: 'HND',
  london: 'LHR',
  amsterdam: 'AMS',
  barcelona: 'BCN',
};

const DESTINATION_ORIGIN_FALLBACKS: Record<string, string> = {
  rome: 'Ankara',
  paris: 'Istanbul',
  tokyo: 'Berlin',
};

function normalizeCity(value: string): string {
  return value.split(',')[0]?.trim().toLowerCase() ?? '';
}

function cleanValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isLegacyCopenhagenPlaceholder(city: string | undefined, airport: string | undefined): boolean {
  const normalizedCity = normalizeCity(city ?? '');
  return normalizedCity === 'copenhagen' && (airport ?? '').trim().toUpperCase() === 'CPH';
}

function airportForCity(city: string): string {
  return CITY_AIRPORTS[normalizeCity(city)] ?? city.slice(0, 3).toUpperCase();
}

function inferDepartureCity(arrivalCity: string): string {
  const destination = normalizeCity(arrivalCity);
  if (destination === 'ankara') return 'Istanbul';
  if (destination === 'istanbul') return 'Ankara';
  return DESTINATION_ORIGIN_FALLBACKS[destination] ?? 'Istanbul';
}

function resolveDeparture(flight: FlightTicketData): { city: string; airport: string } {
  const explicitAirport =
    cleanValue(flight.originAirport) ??
    cleanValue(flight.fromAirport) ??
    cleanValue(flight.departureAirport);
  const candidateCities = [
    cleanValue(flight.origin),
    cleanValue(flight.departure),
    cleanValue(flight.departureCity),
    cleanValue(flight.from),
    cleanValue(flight.originCity),
  ].filter(Boolean) as string[];
  const explicitCity =
    candidateCities.find((city) => !isLegacyCopenhagenPlaceholder(city, explicitAirport)) ??
    candidateCities[0];

  const shouldInfer = isLegacyCopenhagenPlaceholder(explicitCity, explicitAirport);
  const city = shouldInfer ? inferDepartureCity(flight.arrivalCity) : explicitCity ?? inferDepartureCity(flight.arrivalCity);
  const hasLegacyAirport =
    isLegacyCopenhagenPlaceholder(flight.departureCity, flight.departureAirport) &&
    normalizeCity(city) !== 'copenhagen';
  const airport = shouldInfer || hasLegacyAirport || !explicitAirport ? airportForCity(city) : explicitAirport;

  if (normalizeCity(city) === normalizeCity(flight.arrivalCity)) {
    const alternateCity = normalizeCity(city) === 'ankara' ? 'Istanbul' : 'Ankara';
    return { city: alternateCity, airport: airportForCity(alternateCity) };
  }

  return { city, airport };
}

function InfoCell({ label, value, align = 'left', mode }: {
  label: string;
  value: string;
  align?: 'left' | 'right';
  mode: Mode;
}) {
  const colors = palette[mode];
  return (
    <View style={[styles.infoCell, align === 'right' && styles.alignRight]}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function QrPlaceholder({ mode }: { mode: Mode }) {
  const colors = palette[mode];
  const cells = Array.from({ length: 25 }, (_, index) => index);

  return (
    <View style={[styles.qr, { backgroundColor: colors.soft, borderColor: colors.faint }]}>
      {cells.map((cell) => (
        <View
          key={cell}
          style={[
            styles.qrCell,
            { backgroundColor: cell % 3 === 0 || cell % 7 === 0 ? colors.text : 'transparent' },
          ]}
        />
      ))}
    </View>
  );
}

export function FlightTicketCard({ flight, mode }: FlightTicketCardProps) {
  const colors = palette[mode];
  const departure = resolveDeparture(flight);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.label, { color: colors.muted }]}>BOARDING PASS</Text>
          <Text style={[styles.airline, { color: colors.text }]}>{flight.airline}</Text>
        </View>
        <View style={[styles.confirmedBadge, { backgroundColor: colors.accentSoft }]}>
          <Feather name="check-circle" size={13} color={colors.success} />
          <Text style={[styles.confirmedText, { color: colors.success }]}>{flight.status}</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.airportBlock}>
          <Text style={[styles.airportCode, { color: colors.text }]}>{departure.airport}</Text>
          <Text style={[styles.city, { color: colors.muted }]} numberOfLines={1}>
            {departure.city}
          </Text>
          <Text style={[styles.time, { color: colors.text }]}>{flight.departureTime}</Text>
        </View>

        <View style={styles.routeMiddle}>
          <View style={[styles.routeLine, { backgroundColor: colors.faint }]} />
          <View style={[styles.planeCircle, { backgroundColor: colors.accent }]}>
            <Feather name="navigation" size={14} color="#ffffff" />
          </View>
          <Text style={[styles.duration, { color: colors.muted }]}>{flight.duration}</Text>
        </View>

        <View style={[styles.airportBlock, styles.alignRight]}>
          <Text style={[styles.airportCode, { color: colors.text }]}>{flight.arrivalAirport}</Text>
          <Text style={[styles.city, { color: colors.muted }]} numberOfLines={1}>
            {flight.arrivalCity}
          </Text>
          <Text style={[styles.time, { color: colors.text }]}>{flight.arrivalTime}</Text>
        </View>
      </View>

      <View style={[styles.dashedDivider, { borderColor: colors.faint }]}>
        <View style={[styles.notch, styles.notchLeft, { backgroundColor: mode === 'dark' ? '#0b1020' : '#f3f6fb' }]} />
        <View style={[styles.notch, styles.notchRight, { backgroundColor: mode === 'dark' ? '#0b1020' : '#f3f6fb' }]} />
      </View>

      <View style={styles.detailGrid}>
        <InfoCell label="FLIGHT" value={flight.flightNumber} mode={mode} />
        <InfoCell label="DATE" value={flight.date} align="right" mode={mode} />
        <InfoCell label="PASSENGER" value={flight.passengerName} mode={mode} />
        <InfoCell label="SEAT" value={flight.seat} align="right" mode={mode} />
        <InfoCell label="GATE" value={flight.gate} mode={mode} />
        <InfoCell label="PRICE" value={flight.ticketPrice} align="right" mode={mode} />
      </View>

      <View style={styles.footerRow}>
        <View>
          <Text style={[styles.infoLabel, { color: colors.muted }]}>BOOKING REF</Text>
          <Text style={[styles.reference, { color: colors.text }]}>{flight.bookingReference}</Text>
        </View>
        <QrPlaceholder mode={mode} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    elevation: 8,
    gap: 20,
    padding: 20,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  airline: {
    fontSize: 21,
    fontWeight: '800',
  },
  confirmedBadge: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  confirmedText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  airportBlock: { flex: 1 },
  alignRight: { alignItems: 'flex-end' },
  airportCode: {
    fontSize: 34,
    fontWeight: '900',
  },
  city: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  time: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  routeMiddle: {
    alignItems: 'center',
    flex: 0.8,
    justifyContent: 'center',
  },
  routeLine: {
    height: 2,
    position: 'absolute',
    width: '100%',
  },
  planeCircle: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    width: 36,
  },
  duration: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 46,
  },
  dashedDivider: {
    borderStyle: 'dashed',
    borderTopWidth: 1,
    height: 1,
    marginHorizontal: -20,
    position: 'relative',
  },
  notch: {
    borderRadius: 16,
    height: 30,
    position: 'absolute',
    top: -15,
    width: 30,
  },
  notchLeft: { left: -15 },
  notchRight: { right: -15 },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  infoCell: { width: '50%' },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reference: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  qr: {
    alignContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 72,
    justifyContent: 'center',
    padding: 8,
    width: 72,
  },
  qrCell: {
    borderRadius: 1,
    height: 8,
    margin: 1,
    width: 8,
  },
});
