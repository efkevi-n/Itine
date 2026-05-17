import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, type LatLng, type Region } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';

type Mode = 'light' | 'dark';
type RawRecord = Record<string, unknown>;

interface TripRouteMapProps {
  itineraryDays: RawRecord[];
  mode: Mode;
  destination: string;
  hotel?: {
    hotelName: string;
    location: string;
    latitude?: number;
    longitude?: number;
  };
}

interface RouteActivity {
  id: string;
  title: string;
  time: string;
  location: string;
  coordinate: LatLng;
}

interface RouteDay {
  id: string;
  label: string;
  title: string;
  activities: RouteActivity[];
}

interface DestinationFallback {
  keys: string[];
  hotel: LatLng;
  days: RouteDay[];
  isKnown: boolean;
}

const NEUTRAL_COORDINATE: LatLng = { latitude: 0, longitude: 0 };

const palette = {
  light: {
    card: '#ffffff',
    text: '#111827',
    muted: '#64748b',
    border: 'rgba(15,23,42,0.08)',
    soft: '#f8fafc',
    accent: '#2563eb',
    accentSoft: 'rgba(37,99,235,0.12)',
    hotel: '#0f766e',
    hotelSoft: 'rgba(15,118,110,0.14)',
    line: '#2563eb',
    marker: '#ffffff',
    shadow: '#94a3b8',
    mapOverlay: 'rgba(255,255,255,0.92)',
  },
  dark: {
    card: '#161b28',
    text: '#f8fafc',
    muted: '#94a3b8',
    border: 'rgba(255,255,255,0.08)',
    soft: 'rgba(255,255,255,0.05)',
    accent: '#8b9cff',
    accentSoft: 'rgba(139,156,255,0.16)',
    hotel: '#5eead4',
    hotelSoft: 'rgba(45,212,191,0.16)',
    line: '#8b9cff',
    marker: '#101827',
    shadow: '#020617',
    mapOverlay: 'rgba(22,27,40,0.94)',
  },
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#172033' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#d8dee9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1020' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#26324a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#08111f' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1d2a3e' }] },
];

function makeActivity(
  id: string,
  title: string,
  time: string,
  location: string,
  latitude: number,
  longitude: number
): RouteActivity {
  return { id, title, time, location, coordinate: { latitude, longitude } };
}

function makeDay(id: string, label: string, title: string, activities: RouteActivity[]): RouteDay {
  return { id, label, title, activities };
}

const DESTINATION_FALLBACKS: DestinationFallback[] = [
  {
    keys: ['rome', 'italy'],
    hotel: { latitude: 41.9022, longitude: 12.4977 },
    isKnown: true,
    days: [
      makeDay('rome-day-1', 'Day 1', 'Ancient Rome arrival', [
        makeActivity('rome-1-1', 'Colosseum', '10:00 AM', 'Piazza del Colosseo', 41.8902, 12.4922),
        makeActivity('rome-1-2', 'Roman Forum', '1:30 PM', 'Via della Salara Vecchia', 41.8925, 12.4853),
      ]),
      makeDay('rome-day-2', 'Day 2', 'Vatican and riverside Rome', [
        makeActivity('rome-2-1', 'Vatican Museums', '9:30 AM', 'Vatican City', 41.9065, 12.4536),
        makeActivity('rome-2-2', 'Castel Sant Angelo', '3:00 PM', 'Lungotevere Castello', 41.9031, 12.4663),
      ]),
      makeDay('rome-day-3', 'Day 3', 'Classic city walk', [
        makeActivity('rome-3-1', 'Trevi Fountain', '10:30 AM', 'Trevi', 41.9009, 12.4833),
        makeActivity('rome-3-2', 'Pantheon', '2:00 PM', 'Piazza della Rotonda', 41.8986, 12.4769),
      ]),
    ],
  },
  {
    keys: ['paris', 'france'],
    hotel: { latitude: 48.8662, longitude: 2.3242 },
    isKnown: true,
    days: [
      makeDay('paris-day-1', 'Day 1', 'Left Bank arrival', [
        makeActivity('paris-1-1', 'Eiffel Tower', '10:00 AM', 'Champ de Mars', 48.8584, 2.2945),
        makeActivity('paris-1-2', 'Seine river walk', '2:30 PM', 'Pont Alexandre III', 48.8639, 2.3136),
      ]),
      makeDay('paris-day-2', 'Day 2', 'Museums and gardens', [
        makeActivity('paris-2-1', 'Louvre Museum', '9:30 AM', 'Rue de Rivoli', 48.8606, 2.3376),
        makeActivity('paris-2-2', 'Tuileries Garden', '1:30 PM', 'Place de la Concorde', 48.8635, 2.327),
      ]),
      makeDay('paris-day-3', 'Day 3', 'Montmartre afternoon', [
        makeActivity('paris-3-1', 'Sacre-Coeur', '11:00 AM', 'Montmartre', 48.8867, 2.3431),
        makeActivity('paris-3-2', 'Canal Saint-Martin', '4:00 PM', '10th arrondissement', 48.8718, 2.365),
      ]),
    ],
  },
  {
    keys: ['amsterdam', 'netherlands'],
    hotel: { latitude: 52.3678, longitude: 4.8909 },
    isKnown: true,
    days: [
      makeDay('amsterdam-day-1', 'Day 1', 'Canals and old town', [
        makeActivity('amsterdam-1-1', 'Dam Square', '10:30 AM', 'Centrum', 52.3731, 4.8922),
        makeActivity('amsterdam-1-2', 'Canal Ring walk', '2:00 PM', 'Grachtengordel', 52.3676, 4.8852),
      ]),
      makeDay('amsterdam-day-2', 'Day 2', 'Museum quarter', [
        makeActivity('amsterdam-2-1', 'Rijksmuseum', '9:45 AM', 'Museumstraat', 52.36, 4.8852),
        makeActivity('amsterdam-2-2', 'Vondelpark', '1:30 PM', 'Amsterdam-Zuid', 52.3579, 4.8686),
      ]),
      makeDay('amsterdam-day-3', 'Day 3', 'Jordaan and markets', [
        makeActivity('amsterdam-3-1', 'Anne Frank House', '10:00 AM', 'Prinsengracht', 52.3752, 4.884),
        makeActivity('amsterdam-3-2', 'Noord ferry sunset', '5:00 PM', 'Amsterdam Noord', 52.384, 4.9021),
      ]),
    ],
  },
  {
    keys: ['barcelona', 'spain'],
    hotel: { latitude: 41.3902, longitude: 2.1675 },
    isKnown: true,
    days: [
      makeDay('barcelona-day-1', 'Day 1', 'Gaudi arrival', [
        makeActivity('barcelona-1-1', 'Sagrada Familia', '10:00 AM', 'Eixample', 41.4036, 2.1744),
        makeActivity('barcelona-1-2', 'Casa Batllo', '2:30 PM', 'Passeig de Gracia', 41.3917, 2.165),
      ]),
      makeDay('barcelona-day-2', 'Day 2', 'Views and Gothic Quarter', [
        makeActivity('barcelona-2-1', 'Park Guell', '9:45 AM', 'Gracia', 41.4145, 2.1527),
        makeActivity('barcelona-2-2', 'Barcelona Cathedral', '3:00 PM', 'Gothic Quarter', 41.3839, 2.1762),
      ]),
      makeDay('barcelona-day-3', 'Day 3', 'Beach and harbor', [
        makeActivity('barcelona-3-1', 'La Boqueria', '11:00 AM', 'La Rambla', 41.3817, 2.1717),
        makeActivity('barcelona-3-2', 'Barceloneta Beach', '4:30 PM', 'Barceloneta', 41.3784, 2.1925),
      ]),
    ],
  },
  {
    keys: ['istanbul'],
    hotel: { latitude: 41.0115, longitude: 28.9741 },
    isKnown: true,
    days: [
      makeDay('istanbul-day-1', 'Day 1', 'Historic peninsula', [
        makeActivity('istanbul-1-1', 'Hagia Sophia', '10:00 AM', 'Sultanahmet', 41.0086, 28.9802),
        makeActivity('istanbul-1-2', 'Blue Mosque', '1:30 PM', 'Sultanahmet Square', 41.0054, 28.9768),
      ]),
      makeDay('istanbul-day-2', 'Day 2', 'Markets and Bosphorus', [
        makeActivity('istanbul-2-1', 'Grand Bazaar', '10:30 AM', 'Fatih', 41.0107, 28.968),
        makeActivity('istanbul-2-2', 'Galata Tower', '3:30 PM', 'Beyoglu', 41.0256, 28.9741),
      ]),
      makeDay('istanbul-day-3', 'Day 3', 'Palace and ferry views', [
        makeActivity('istanbul-3-1', 'Topkapi Palace', '9:45 AM', 'Cankurtaran', 41.0115, 28.9834),
        makeActivity('istanbul-3-2', 'Kadikoy waterfront', '5:00 PM', 'Asian side', 40.9909, 29.0303),
      ]),
    ],
  },
  {
    keys: ['ankara'],
    hotel: { latitude: 39.9209, longitude: 32.8543 },
    isKnown: true,
    days: [
      makeDay('ankara-day-1', 'Day 1', 'Capital landmarks', [
        makeActivity('ankara-1-1', 'Anitkabir', '10:00 AM', 'Cankaya', 39.9251, 32.8368),
        makeActivity('ankara-1-2', 'Kizilay Square', '2:00 PM', 'City center', 39.9208, 32.8541),
      ]),
      makeDay('ankara-day-2', 'Day 2', 'Old Ankara', [
        makeActivity('ankara-2-1', 'Ankara Castle', '10:30 AM', 'Altindag', 39.9419, 32.8641),
        makeActivity('ankara-2-2', 'Museum of Anatolian Civilizations', '1:30 PM', 'Ulus', 39.9388, 32.8616),
      ]),
      makeDay('ankara-day-3', 'Day 3', 'Parks and modern city', [
        makeActivity('ankara-3-1', 'Atakule', '11:00 AM', 'Cankaya', 39.8867, 32.8569),
        makeActivity('ankara-3-2', 'Genclik Park', '4:00 PM', 'Ulus', 39.9365, 32.8524),
      ]),
    ],
  },
  {
    keys: ['london', 'uk', 'united kingdom', 'england'],
    hotel: { latitude: 51.5079, longitude: -0.1276 },
    isKnown: true,
    days: [
      makeDay('london-day-1', 'Day 1', 'Westminster arrival', [
        makeActivity('london-1-1', 'Big Ben', '10:00 AM', 'Westminster', 51.5007, -0.1246),
        makeActivity('london-1-2', 'London Eye', '1:30 PM', 'South Bank', 51.5033, -0.1195),
      ]),
      makeDay('london-day-2', 'Day 2', 'Museums and parks', [
        makeActivity('london-2-1', 'British Museum', '10:00 AM', 'Bloomsbury', 51.5194, -0.127),
        makeActivity('london-2-2', 'Hyde Park', '3:00 PM', 'Kensington', 51.5073, -0.1657),
      ]),
      makeDay('london-day-3', 'Day 3', 'Tower and river', [
        makeActivity('london-3-1', 'Tower Bridge', '10:30 AM', 'Tower Hamlets', 51.5055, -0.0754),
        makeActivity('london-3-2', 'Covent Garden', '4:00 PM', 'West End', 51.5117, -0.124),
      ]),
    ],
  },
  {
    keys: ['tokyo', 'japan'],
    hotel: { latitude: 35.6764, longitude: 139.7633 },
    isKnown: true,
    days: [
      makeDay('tokyo-day-1', 'Day 1', 'Arrival and Shibuya', [
        makeActivity('tokyo-1-1', 'Shibuya Crossing', '10:30 AM', 'Shibuya City', 35.6595, 139.7005),
        makeActivity('tokyo-1-2', 'Harajuku coffee walk', '2:00 PM', 'Harajuku', 35.6702, 139.7027),
      ]),
      makeDay('tokyo-day-2', 'Day 2', 'Old Tokyo highlights', [
        makeActivity('tokyo-2-1', 'Senso-ji Temple', '9:45 AM', 'Asakusa', 35.7148, 139.7967),
        makeActivity('tokyo-2-2', 'Ueno market lunch', '1:15 PM', 'Ueno', 35.7101, 139.7745),
      ]),
      makeDay('tokyo-day-3', 'Day 3', 'Gardens and skyline', [
        makeActivity('tokyo-3-1', 'Shinjuku Gyoen', '11:00 AM', 'Shinjuku', 35.6852, 139.7101),
        makeActivity('tokyo-3-2', 'Tokyo Tower sunset', '5:40 PM', 'Minato City', 35.6586, 139.7454),
      ]),
    ],
  },
];

function unknownDestinationFallback(destination: string): DestinationFallback {
  const label = destination.trim() || 'Selected destination';
  return {
    keys: [],
    hotel: NEUTRAL_COORDINATE,
    isKnown: false,
    days: [
      makeDay('unknown-day-1', 'Day 1', `${label} arrival route`, [
        makeActivity('unknown-1-1', `${label} city center`, '10:00 AM', 'Destination center', 0, 0),
        makeActivity('unknown-1-2', `${label} local walk`, '2:00 PM', 'Local area', 0.01, 0.01),
      ]),
      makeDay('unknown-day-2', 'Day 2', `${label} culture route`, [
        makeActivity('unknown-2-1', `${label} landmark stop`, '10:30 AM', 'Cultural district', 0.02, 0.005),
        makeActivity('unknown-2-2', `${label} viewpoint`, '4:00 PM', 'Scenic area', -0.01, 0.015),
      ]),
      makeDay('unknown-day-3', 'Day 3', `${label} final day`, [
        makeActivity('unknown-3-1', `${label} market visit`, '11:00 AM', 'Market district', 0.015, -0.01),
        makeActivity('unknown-3-2', `${label} evening walk`, '5:30 PM', 'Evening route', -0.005, -0.015),
      ]),
    ],
  };
}

function fallbackForDestination(destination: string): DestinationFallback {
  const normalized = destination.toLowerCase();
  return (
    DESTINATION_FALLBACKS.find((fallback) =>
      fallback.keys.some((key) => normalized.includes(key))
    ) ?? unknownDestinationFallback(destination)
  );
}

function asRecord(value: unknown): RawRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : undefined;
}

function readString(raw: RawRecord | undefined, keys: string[]): string | undefined {
  if (!raw) return undefined;
  for (const key of keys) {
    const value = raw[key];
    if (value != null && String(value).trim().length > 0) return String(value);
  }
  return undefined;
}

function readNumber(raw: RawRecord | undefined, keys: string[]): number | undefined {
  if (!raw) return undefined;
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

function coordinateFrom(raw: RawRecord | undefined): LatLng | undefined {
  const location = asRecord(raw?.location);
  const coordinates = asRecord(raw?.coordinates);
  const geo = asRecord(raw?.geo);
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

function activitiesFromDay(day: RawRecord, dayIndex: number): RouteActivity[] {
  const activityList = Array.isArray(day.activities) ? day.activities : [];
  const rawActivities = activityList.filter(asRecord) as RawRecord[];

  return rawActivities
    .map((activity, activityIndex) => {
      const coordinate = coordinateFrom(activity);
      if (!coordinate) return undefined;

      const location = asRecord(activity.location);
      return {
        id: `day-${dayIndex}-activity-${activityIndex}`,
        title: readString(activity, ['title', 'name', 'activity', 'description']) ?? `Stop ${activityIndex + 1}`,
        time: readString(activity, ['time', 'startTime', 'start_time']) ?? 'Flexible',
        location:
          readString(activity, ['address', 'locationName', 'place']) ??
          readString(location, ['name', 'address', 'city']) ??
          'Planned stop',
        coordinate,
      };
    })
    .filter(Boolean) as RouteActivity[];
}

function normalizeDays(itineraryDays: RawRecord[], destinationFallback: DestinationFallback): RouteDay[] {
  const days = itineraryDays
    .map((day, dayIndex) => {
      const activities = activitiesFromDay(day, dayIndex);
      if (activities.length === 0) return undefined;

      return {
        id: `day-${dayIndex}`,
        label: `Day ${dayIndex + 1}`,
        title: readString(day, ['title', 'summary', 'name']) ?? `Day ${dayIndex + 1} route`,
        activities,
      };
    })
    .filter(Boolean) as RouteDay[];

  return days.length > 0 ? days : destinationFallback.days;
}

function firstActivityCoordinate(days: RouteDay[]): LatLng | undefined {
  for (const day of days) {
    const coordinate = day.activities[0]?.coordinate;
    if (coordinate) return coordinate;
  }
  return undefined;
}

function regionFor(coordinates: LatLng[], fallbackCoordinate: LatLng): Region {
  const first = coordinates[0] ?? fallbackCoordinate;
  return {
    latitude: first.latitude,
    longitude: first.longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };
}


export const TripRouteMap = memo(function TripRouteMap({
  itineraryDays,
  mode,
  destination,
  hotel,
}: TripRouteMapProps) {
  const colors = palette[mode];
  const mapRef = useRef<MapView | null>(null);
  const expandedMapRef = useRef<MapView | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const destinationFallback = useMemo(() => fallbackForDestination(destination), [destination]);
  const days = useMemo(
    () => normalizeDays(itineraryDays, destinationFallback),
    [destinationFallback, itineraryDays]
  );
  const fallbackActivityCoordinate = useMemo(() => firstActivityCoordinate(days), [days]);
  const hotelCoordinate = useMemo<LatLng>(() => {
    if (hotel?.latitude != null && hotel.longitude != null) {
      return { latitude: hotel.latitude, longitude: hotel.longitude };
    }
    if (destinationFallback.isKnown) return destinationFallback.hotel;
    return fallbackActivityCoordinate ?? NEUTRAL_COORDINATE;
  }, [destinationFallback, fallbackActivityCoordinate, hotel?.latitude, hotel?.longitude]);
  const [selectedDayId, setSelectedDayId] = useState(days[0]?.id ?? destinationFallback.days[0].id);
  const selectedDay = useMemo(
    () => days.find((day) => day.id === selectedDayId) ?? days[0],
    [days, selectedDayId]
  );
  const selectedCoordinates = useMemo(() => {
    const activityCoordinates = selectedDay?.activities.map((activity) => activity.coordinate) ?? [];
    return [...activityCoordinates, hotelCoordinate];
  }, [hotelCoordinate, selectedDay]);
  const selectedRouteCoordinates = useMemo(
    () => selectedDay?.activities.map((activity) => activity.coordinate) ?? [],
    [selectedDay]
  );
  const initialRegion = useMemo(
    () => regionFor(selectedCoordinates, hotelCoordinate),
    [hotelCoordinate, selectedCoordinates]
  );

  const focusMap = useCallback((targetRef: React.RefObject<MapView | null>, coordinates: LatLng[]) => {
    const targetMap = targetRef.current;
    if (!targetMap) return;

    if (coordinates.length > 1) {
      targetMap.fitToCoordinates(coordinates, {
        animated: true,
        edgePadding: { top: 72, right: 58, bottom: 72, left: 58 },
      });
      return;
    }

    const coordinate = coordinates[0];
    if (coordinate) {
      targetMap.animateToRegion(
        {
          ...coordinate,
          latitudeDelta: 0.055,
          longitudeDelta: 0.055,
        },
        450
      );
    }
  }, []);

  const focusCoordinates = useCallback(
    (coordinates: LatLng[]) => {
      focusMap(mapRef, coordinates);
      if (isExpanded) focusMap(expandedMapRef, coordinates);
    },
    [focusMap, isExpanded]
  );

  useEffect(() => {
    if (selectedCoordinates.length > 0) {
      focusCoordinates(selectedCoordinates);
    }
  }, [focusCoordinates, selectedCoordinates]);

  useEffect(() => {
    if (!days.some((day) => day.id === selectedDayId)) {
      setSelectedDayId(days[0]?.id ?? destinationFallback.days[0].id);
    }
  }, [days, destinationFallback.days, selectedDayId]);

  const handleDayPress = useCallback(
    (day: RouteDay) => {
      setSelectedDayId(day.id);
      focusCoordinates([...day.activities.map((activity) => activity.coordinate), hotelCoordinate]);
    },
    [focusCoordinates, hotelCoordinate]
  );

  const handleOpenExpanded = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const renderMapContent = useCallback(
    (targetRef: React.RefObject<MapView | null>, expanded = false) => (
      <View style={expanded ? styles.expandedMapWrap : styles.mapClip}>
        <MapView
          ref={targetRef}
          style={styles.map}
          initialRegion={initialRegion}
          customMapStyle={mode === 'dark' ? darkMapStyle : []}
          showsCompass={false}
          showsUserLocation={false}
          toolbarEnabled={false}
          onMapReady={() => focusMap(targetRef, selectedCoordinates)}
        >
          {selectedRouteCoordinates.length > 1 ? (
            <Polyline
              coordinates={selectedRouteCoordinates}
              strokeColor={colors.line}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          ) : null}

          <Marker
            coordinate={hotelCoordinate}
            title={hotel?.hotelName ?? 'Hotel Stay'}
            description={hotel?.location ?? destination}
            tracksViewChanges={false}
          >
            <View style={[styles.hotelMarker, { backgroundColor: colors.hotelSoft, borderColor: colors.hotel }]}> 
              <View style={[styles.hotelIcon, { backgroundColor: colors.hotel }]}> 
                <Feather name="home" size={13} color="#ffffff" />
              </View>
              <Text style={[styles.hotelLabel, { color: colors.hotel }]}>Hotel</Text>
            </View>
          </Marker>

          {days.flatMap((day, dayIndex) =>
            day.activities.map((activity, activityIndex) => {
              const isActive = day.id === selectedDay?.id;
              return (
                <Marker
                  key={activity.id}
                  coordinate={activity.coordinate}
                  title={activity.title}
                  description={activity.location}
                  tracksViewChanges={false}
                >
                  <View
                    style={[
                      styles.marker,
                      {
                        backgroundColor: isActive ? colors.accent : colors.marker,
                        borderColor: colors.accent,
                      },
                    ]}
                  >
                    <Text style={[styles.markerText, { color: isActive ? '#ffffff' : colors.accent }]}> 
                      {activityIndex === 0 ? dayIndex + 1 : activityIndex + 1}
                    </Text>
                  </View>
                </Marker>
              );
            })
          )}
        </MapView>

        <View
          style={[
            styles.mapOverlay,
            expanded ? styles.expandedMapOverlay : null,
            { backgroundColor: colors.mapOverlay },
          ]}
        >
          <Text style={[styles.mapOverlayTitle, { color: colors.text }]}>{selectedDay?.label}</Text>
          <Text style={[styles.mapOverlayMeta, { color: colors.muted }]} numberOfLines={1}>
            {selectedDay?.title}
          </Text>
        </View>

        {!expanded ? (
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleOpenExpanded}
            style={[styles.expandButton, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}
          >
            <Feather name="maximize-2" size={14} color={colors.accent} />
            <Text style={[styles.expandButtonText, { color: colors.accent }]}>Expand Map</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    ),
    [
      colors,
      days,
      destination,
      focusMap,
      handleOpenExpanded,
      hotel,
      hotelCoordinate,
      initialRegion,
      mode,
      selectedCoordinates,
      selectedDay,
      selectedRouteCoordinates,
    ]
  );

  const renderDayChips = useCallback(
    (expanded = false) => (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.chipRow, expanded ? styles.expandedChipRow : null]}
      >
        {days.map((day) => {
          const isActive = day.id === selectedDay?.id;
          return (
            <TouchableOpacity
              key={day.id}
              activeOpacity={0.82}
              onPress={() => handleDayPress(day)}
              style={[
                styles.dayChip,
                {
                  backgroundColor: isActive ? colors.accent : colors.soft,
                  borderColor: isActive ? colors.accent : colors.border,
                },
              ]}
            >
              <Text style={[styles.dayChipText, { color: isActive ? '#ffffff' : colors.text }]}> 
                {day.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    ),
    [colors, days, handleDayPress, selectedDay]
  );

  const renderActivityPreview = useCallback(
    (expanded = false) => (
      <View
        style={[
          styles.previewCard,
          expanded ? styles.expandedPreviewCard : null,
          { backgroundColor: colors.soft, borderColor: colors.border },
        ]}
      >
        <View style={styles.previewHeader}>
          <View>
            <Text style={[styles.previewLabel, { color: colors.muted }]}>SELECTED DAY</Text>
            <Text style={[styles.previewTitle, { color: colors.text }]}>{selectedDay?.title}</Text>
          </View>
          <Text style={[styles.stopCount, { color: colors.accent }]}> 
            {selectedDay?.activities.length ?? 0} stops
          </Text>
        </View>

        <View style={styles.activityList}>
          <View style={styles.activityRow}>
            <View style={[styles.timelineDot, { backgroundColor: colors.hotel }]} />
            <View style={styles.activityCopy}>
              <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
                {hotel?.hotelName ?? 'Hotel Stay'}
              </Text>
              <Text style={[styles.activityMeta, { color: colors.muted }]} numberOfLines={1}>
                Hotel - {hotel?.location ?? destination}
              </Text>
            </View>
          </View>

          {selectedDay?.activities.map((activity) => (
            <View key={activity.id} style={styles.activityRow}>
              <View style={[styles.timelineDot, { backgroundColor: colors.accent }]} />
              <View style={styles.activityCopy}>
                <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
                  {activity.title}
                </Text>
                <Text style={[styles.activityMeta, { color: colors.muted }]} numberOfLines={1}>
                  {activity.time} - {activity.location}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    ),
    [colors, destination, hotel, selectedDay]
  );

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.kicker, { color: colors.muted }]}>INTERACTIVE ROUTE</Text>
          <Text style={[styles.title, { color: colors.text }]}>Trip Route Map</Text>
        </View>
        <View style={[styles.destinationPill, { backgroundColor: colors.accentSoft }]}> 
          <Feather name="map-pin" size={13} color={colors.accent} />
          <Text style={[styles.destinationText, { color: colors.accent }]} numberOfLines={1}>
            {destination}
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}> 
        {renderMapContent(mapRef)}
        {renderDayChips()}
        {renderActivityPreview()}
      </View>

      <Modal
        visible={isExpanded}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseExpanded}
        onShow={() => focusMap(expandedMapRef, selectedCoordinates)}
      >
        <View style={[styles.expandedScreen, { backgroundColor: colors.card }]}> 
          {renderMapContent(expandedMapRef, true)}

          <View style={styles.expandedTopBar}>
            <View style={[styles.expandedTitleBlock, { backgroundColor: colors.mapOverlay }]}> 
              <Text style={[styles.expandedKicker, { color: colors.muted }]}>TRIP ROUTE MAP</Text>
              <Text style={[styles.expandedTitle, { color: colors.text }]} numberOfLines={1}>
                {destination}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={handleCloseExpanded}
              style={[styles.closeButton, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}
            >
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.expandedBottomSheet, { backgroundColor: colors.mapOverlay, borderColor: colors.border }]}> 
            {renderDayChips(true)}
            {renderActivityPreview(true)}
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: 14 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
  },
  destinationPill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    maxWidth: 132,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  destinationText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    borderRadius: 28,
    elevation: 7,
    gap: 14,
    overflow: 'hidden',
    paddingBottom: 16,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
  },
  mapClip: {
    height: 260,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  map: { ...StyleSheet.absoluteFillObject },
  expandedScreen: { flex: 1 },
  expandedMapWrap: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  expandedTopBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    left: 18,
    position: 'absolute',
    right: 18,
    top: 52,
  },
  expandedTitleBlock: {
    borderRadius: 20,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  expandedKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 3,
  },
  expandedTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  mapOverlay: {
    borderRadius: 18,
    bottom: 14,
    left: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    position: 'absolute',
    right: 14,
  },
  mapOverlayTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  mapOverlayMeta: {
    fontSize: 12,
    fontWeight: '700',
  },
  expandedMapOverlay: {
    bottom: 210,
    left: 18,
    right: 18,
  },
  expandButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    position: 'absolute',
    right: 14,
    top: 14,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },
  marker: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  markerText: {
    fontSize: 12,
    fontWeight: '900',
  },
  hotelMarker: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  hotelIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  hotelLabel: {
    fontSize: 11,
    fontWeight: '900',
  },
  chipRow: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  expandedBottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    bottom: 0,
    gap: 12,
    left: 0,
    maxHeight: '45%',
    paddingBottom: 24,
    paddingTop: 16,
    position: 'absolute',
    right: 0,
  },
  expandedChipRow: {
    paddingHorizontal: 18,
  },
  dayChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '900',
  },
  previewCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 16,
    padding: 15,
  },
  expandedPreviewCard: {
    marginHorizontal: 18,
  },
  previewHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 5,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  stopCount: {
    fontSize: 12,
    fontWeight: '900',
  },
  activityList: { gap: 12 },
  activityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  timelineDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  activityCopy: { flex: 1 },
  activityTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
});

