import type { LatLng } from 'react-native-maps';

type RawRecord = Record<string, unknown>;

const CITY_COORDS: { keys: string[]; coordinate: LatLng }[] = [
  { keys: ['paris', 'france'], coordinate: { latitude: 48.8566, longitude: 2.3522 } },
  { keys: ['london', 'uk'], coordinate: { latitude: 51.5074, longitude: -0.1278 } },
  { keys: ['rome', 'italy'], coordinate: { latitude: 41.9028, longitude: 12.4964 } },
  { keys: ['barcelona', 'spain'], coordinate: { latitude: 41.3874, longitude: 2.1686 } },
  { keys: ['amsterdam', 'netherlands'], coordinate: { latitude: 52.3676, longitude: 4.9041 } },
  { keys: ['istanbul', 'turkey'], coordinate: { latitude: 41.0082, longitude: 28.9784 } },
  { keys: ['tokyo', 'japan'], coordinate: { latitude: 35.6762, longitude: 139.6503 } },
  { keys: ['dubai', 'uae'], coordinate: { latitude: 25.2048, longitude: 55.2708 } },
  { keys: ['new york', 'nyc'], coordinate: { latitude: 40.7128, longitude: -74.006 } },
  { keys: ['bangkok', 'thailand'], coordinate: { latitude: 13.7563, longitude: 100.5018 } },
  { keys: ['berlin', 'germany'], coordinate: { latitude: 52.52, longitude: 13.405 } },
  { keys: ['lisbon', 'portugal'], coordinate: { latitude: 38.7223, longitude: -9.1393 } },
];

export function getDestinationCoordinate(destination: string): LatLng {
  const normalized = destination.toLowerCase();
  const match = CITY_COORDS.find((entry) => entry.keys.some((key) => normalized.includes(key)));
  return match?.coordinate ?? { latitude: 48.8566, longitude: 2.3522 };
}

export function coordinateFromRaw(raw: RawRecord | undefined): LatLng | undefined {
  if (!raw) return undefined;
  const location = asRecord(raw.location);
  const coordinates = asRecord(raw.coordinates);
  const geo = asRecord(raw.geo);
  const sources = [raw, location, coordinates, geo].filter(Boolean) as RawRecord[];

  for (const source of sources) {
    const latitude = readNumber(source, ['latitude', 'lat']);
    const longitude = readNumber(source, ['longitude', 'lng', 'lon']);
    if (latitude != null && longitude != null) {
      return { latitude, longitude };
    }
  }
  return undefined;
}

/** Spread stops around a center when API has no coordinates. */
export function offsetCoordinate(base: LatLng, index: number, total: number): LatLng {
  if (total <= 1) return base;
  const angle = (index / total) * Math.PI * 2;
  const radius = 0.012 + (index % 3) * 0.004;
  return {
    latitude: base.latitude + Math.cos(angle) * radius,
    longitude: base.longitude + Math.sin(angle) * radius,
  };
}

function asRecord(value: unknown): RawRecord | undefined {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RawRecord)
    : undefined;
}

function readNumber(raw: RawRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

export function readString(raw: RawRecord | undefined, keys: string[]): string {
  if (!raw) return '';
  for (const key of keys) {
    const value = raw[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}
