import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { userApi } from '@/api/user';
import { authApi } from '@/api/auth';
import { tripsApi } from '@/api/trips';
import { cancelAllReminders } from '@/utils/notifications';
import { clearAllNotifications } from '@/utils/notificationStore';
import { clearTokens } from '@/utils/auth';
import type { ProfileView } from '@/types/user';
import { mapProfileToView } from '@/utils/profileMappers';
import { showToast } from '@/utils/toastStore';
import { getErrorMessage } from '@/utils/errorHandler';
import { SUCCESS_MESSAGES } from '@/constants/errors';

type Mode = 'light' | 'dark';
type RawRecord = Record<string, unknown>;
type FeatherName = keyof typeof Feather.glyphMap;

interface ProfileMeta {
  role: string;
  status: string;
  university: string;
  studentId: string;
  memberSince: string;
  travelStyle: string;
  language: string;
  themePreference: string;
}

interface ProfileStats {
  upcomingTrips: number;
  completedTrips: number;
  savedDestinations: number;
}

const APP_VERSION = 'ITINE v1.0.0';
const MANAGEMENT_EMAILS = ['220201811@ostimteknik.edu.tr', '220201722@ostimteknik.edu.tr'];

const defaultMeta: ProfileMeta = {
  role: 'Traveler',
  status: 'Active account',
  university: 'Not added',
  studentId: 'Not added',
  memberSince: 'Recently joined',
  travelStyle: 'Flexible explorer',
  language: 'English',
  themePreference: 'System default',
};

const palette = {
  light: {
    background: '#f3f6fb',
    card: '#ffffff',
    elevated: 'rgba(255,255,255,0.78)',
    text: '#101827',
    muted: '#667085',
    subtle: '#94a3b8',
    border: 'rgba(15,23,42,0.08)',
    accent: '#2563eb',
    accentSoft: 'rgba(37,99,235,0.11)',
    success: '#16a34a',
    successSoft: 'rgba(22,163,74,0.12)',
    danger: '#ef4444',
    dangerSoft: 'rgba(239,68,68,0.09)',
    glowA: 'rgba(37,99,235,0.18)',
    glowB: 'rgba(20,184,166,0.14)',
    shadow: '#94a3b8',
    input: '#f8fafc',
  },
  dark: {
    background: '#0b1020',
    card: '#151a27',
    elevated: 'rgba(255,255,255,0.06)',
    text: '#f8fafc',
    muted: '#94a3b8',
    subtle: '#64748b',
    border: 'rgba(255,255,255,0.08)',
    accent: '#8b9cff',
    accentSoft: 'rgba(139,156,255,0.14)',
    success: '#86efac',
    successSoft: 'rgba(134,239,172,0.13)',
    danger: '#f87171',
    dangerSoft: 'rgba(248,113,113,0.1)',
    glowA: 'rgba(99,102,241,0.2)',
    glowB: 'rgba(45,212,191,0.12)',
    shadow: '#020617',
    input: 'rgba(255,255,255,0.05)',
  },
};

function asRecord(value: unknown): RawRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : undefined;
}

function profileSource(raw: RawRecord): RawRecord {
  return asRecord(raw.user) ?? raw;
}

function readString(raw: RawRecord | undefined, keys: string[]): string | undefined {
  if (!raw) return undefined;
  const preferences = asRecord(raw.preferences);
  const sources = [raw, asRecord(raw.profile), preferences].filter(Boolean) as RawRecord[];

  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (value != null && String(value).trim()) return String(value).trim();
    }
  }

  return undefined;
}

function getRawList(payload: unknown): RawRecord[] {
  if (Array.isArray(payload)) return payload.filter(asRecord) as RawRecord[];
  const record = asRecord(payload);
  const data = record?.data;
  return Array.isArray(data) ? (data.filter(asRecord) as RawRecord[]) : [];
}

function formatDate(value: string | undefined): string {
  if (!value) return defaultMeta.memberSince;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getInitials(name?: string, email?: string): string {
  const raw = (name || email || 'Traveler').trim();
  const base = raw.includes('@') ? raw.split('@')[0] : raw;
  const parts = base.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'T';
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? 'R';
  return `${first}${second}`.toUpperCase();
}

function getDisplayName(profile: ProfileView): string {
  if (profile.name.trim()) return profile.name.trim();
  if (profile.email.includes('@')) {
    return profile.email
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  return 'Traveler';
}

function deriveProfileMeta(raw: RawRecord): ProfileMeta {
  const source = profileSource(raw);

  return {
    role: readString(source, ['role', 'accountType', 'type']) ?? defaultMeta.role,
    status: readString(source, ['status', 'accountStatus']) ?? defaultMeta.status,
    university: readString(source, ['university', 'school', 'institution', 'organization']) ?? defaultMeta.university,
    studentId: readString(source, ['studentId', 'student_id', 'schoolId']) ?? defaultMeta.studentId,
    memberSince: formatDate(readString(source, ['createdAt', 'created_at', 'memberSince', 'joinedAt'])),
    travelStyle: readString(source, ['travelStyle', 'preferredTravelStyle', 'style']) ?? defaultMeta.travelStyle,
    language: readString(source, ['language', 'locale']) ?? defaultMeta.language,
    themePreference: readString(source, ['theme', 'themePreference', 'appearance']) ?? defaultMeta.themePreference,
  };
}

function getTripStats(payload: unknown): ProfileStats {
  const trips = getRawList(payload);
  const destinations = new Set<string>();
  let upcomingTrips = 0;
  let completedTrips = 0;

  for (const trip of trips) {
    const status = String(trip.status ?? '').toUpperCase();
    const destination = String(trip.destination ?? '').trim();
    if (destination) destinations.add(destination);
    if (['PENDING', 'CONFIRMED', 'ACTIVE'].includes(status)) upcomingTrips += 1;
    if (status === 'COMPLETED') completedTrips += 1;
  }

  return {
    upcomingTrips,
    completedTrips,
    savedDestinations: destinations.size,
  };
}

function SectionTitle({ title, eyebrow, mode }: { title: string; eyebrow?: string; mode: Mode }) {
  const colors = palette[mode];
  return (
    <View style={styles.sectionTitle}>
      {eyebrow ? <Text style={[styles.eyebrow, { color: colors.muted }]}>{eyebrow}</Text> : null}
      <Text style={[styles.sectionHeading, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mode,
}: {
  icon: FeatherName;
  label: string;
  value: string;
  mode: Mode;
}) {
  const colors = palette[mode];
  return (
    <View style={[styles.infoRow, { borderColor: colors.border }]}> 
      <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}> 
        <Feather name={icon} size={16} color={colors.accent} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  mode,
}: {
  icon: FeatherName;
  label: string;
  value: string;
  mode: Mode;
}) {
  const colors = palette[mode];
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: colors.elevated }]}> 
        <Feather name={icon} size={16} color={colors.accent} />
      </View>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.settingValue, { color: colors.muted }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const mode: Mode = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = palette[mode];

  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [profileMeta, setProfileMeta] = useState<ProfileMeta>(defaultMeta);
  const [stats, setStats] = useState<ProfileStats>({ upcomingTrips: 0, completedTrips: 0, savedDestinations: 0 });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [profileRes, tripsRes] = await Promise.all([
        userApi.getProfile(),
        tripsApi.getAll({ page: 1, limit: 50 }).catch(() => ({ data: [] })),
      ]);

      const raw = (profileRes.data ?? {}) as RawRecord;
      const view = mapProfileToView(raw);
      setProfile(view);
      setProfileMeta(deriveProfileMeta(raw));
      setName(view.name);
      setPhone(view.phone);
      setStats(getTripStats(tripsRes.data));
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handlePhotoPress = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    setUploadLoading(true);
    setSaveError(null);

    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as unknown as Blob);

      await userApi.uploadPhoto(formData);
      const res = await userApi.getProfile();
      const raw = (res.data ?? {}) as RawRecord;
      const view = mapProfileToView(raw);
      setProfile(view);
      setProfileMeta(deriveProfileMeta(raw));
    } catch (e: unknown) {
      setSaveError(getErrorMessage(e));
    } finally {
      setUploadLoading(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setSaveLoading(true);
    try {
      await userApi.updateProfile({ name, phone });
      showToast('success', SUCCESS_MESSAGES.PROFILE_UPDATED);
      const res = await userApi.getProfile();
      const raw = (res.data ?? {}) as RawRecord;
      setProfile(mapProfileToView(raw));
      setProfileMeta(deriveProfileMeta(raw));
    } catch (e: unknown) {
      setSaveError(getErrorMessage(e));
    } finally {
      setSaveLoading(false);
    }
  }, [name, phone]);

  const handleLogout = useCallback(async () => {
    await cancelAllReminders();
    await clearAllNotifications();
    try {
      await authApi.logout();
    } catch {
      // continue to clear local state
    }
    await clearTokens();
    showToast('success', SUCCESS_MESSAGES.LOGGED_OUT);
    router.replace('/login');
  }, [router]);

  const handleContactManagement = useCallback(async (email: string) => {
    const url = `mailto:${email}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // fall through to display-only alert
    }
    Alert.alert('Contact Management', email);
  }, []);

  const currentProfile = useMemo<ProfileView>(
    () => profile ?? { name: '', email: '', phone: '', photoUrl: null },
    [profile]
  );
  const displayName = useMemo(() => getDisplayName(currentProfile), [currentProfile]);
  const initials = useMemo(
    () => getInitials(displayName, currentProfile.email),
    [currentProfile.email, displayName]
  );

  if (loading && !profile) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}> 
        <View style={[styles.glowOrbTop, { backgroundColor: colors.glowA }]} />
        <View style={[styles.glowOrbBottom, { backgroundColor: colors.glowB }]} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading profile...</Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}> 
        <View style={[styles.glowOrbTop, { backgroundColor: colors.glowA }]} />
        <View style={[styles.glowOrbBottom, { backgroundColor: colors.glowB }]} />
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.accent }]} onPress={loadProfile}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <View style={[styles.glowOrbTop, { backgroundColor: colors.glowA }]} />
      <View style={[styles.glowOrbBottom, { backgroundColor: colors.glowB }]} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, { color: colors.muted }]}>PROFILE</Text>
        <Text style={[styles.title, { color: colors.text }]}>Traveler Profile</Text>

        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}> 
          <View style={styles.heroPattern} />
          <TouchableOpacity style={styles.avatarButton} onPress={handlePhotoPress} disabled={uploadLoading}>
            {currentProfile.photoUrl ? (
              <Image source={{ uri: currentProfile.photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}> 
                <Text style={[styles.avatarInitials, { color: colors.text }]}>{initials}</Text>
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: colors.accent }]}> 
              {uploadLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Feather name="camera" size={14} color="#ffffff" />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.heroCopy}>
            <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.heroEmail, { color: colors.muted }]} numberOfLines={1}>
              {currentProfile.email || 'Email not added'}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: colors.successSoft }]}> 
                <Feather name="check-circle" size={13} color={colors.success} />
                <Text style={[styles.statusText, { color: colors.success }]}>{profileMeta.status}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: colors.accentSoft }]}> 
                <Text style={[styles.roleText, { color: colors.accent }]}>{profileMeta.role}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.upcomingTrips}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Upcoming</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.completedTrips}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.savedDestinations}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Destinations</Text>
          </View>
        </View>

        <SectionTitle eyebrow="ACCOUNT" title="Profile details" mode={mode} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.inputLabel, { color: colors.muted }]}>Full name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.subtle}
            autoCapitalize="words"
          />

          <Text style={[styles.inputLabel, { color: colors.muted }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              styles.inputReadOnly,
              { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
            ]}
            value={currentProfile.email}
            editable={false}
            placeholder="Email"
            placeholderTextColor={colors.subtle}
          />

          <Text style={[styles.inputLabel, { color: colors.muted }]}>Phone</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor={colors.subtle}
            keyboardType="phone-pad"
          />

          <View style={styles.detailRows}>
            <InfoRow icon="phone" label="Phone" value={phone || 'Not added'} mode={mode} />
            <InfoRow icon="book-open" label="University" value={profileMeta.university} mode={mode} />
            <InfoRow icon="credit-card" label="Student ID" value={profileMeta.studentId} mode={mode} />
            <InfoRow icon="calendar" label="Member since" value={profileMeta.memberSince} mode={mode} />
          </View>

          {saveError ? <Text style={[styles.saveErrorText, { color: colors.danger }]}>{saveError}</Text> : null}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.accent }]}
            onPress={handleSave}
            disabled={saveLoading}
          >
            {saveLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Feather name="save" size={16} color="#ffffff" />
                <Text style={styles.saveBtnText}>Save profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <SectionTitle eyebrow="SETTINGS" title="App preferences" mode={mode} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <SettingRow icon="bell" label="Notifications" value="Trip reminders on" mode={mode} />
          <SettingRow icon="moon" label="Appearance" value={profileMeta.themePreference || 'System'} mode={mode} />
          <SettingRow icon="globe" label="Language" value={profileMeta.language} mode={mode} />
          <SettingRow icon="shield" label="Privacy & Security" value="Protected" mode={mode} />
          <SettingRow icon="sliders" label="App Preferences" value="Personalized" mode={mode} />
        </View>

        <SectionTitle eyebrow="TRAVEL" title="Preferences" mode={mode} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <InfoRow icon="compass" label="Preferred travel style" value={profileMeta.travelStyle} mode={mode} />
          <InfoRow icon="map-pin" label="Saved destinations" value={`${stats.savedDestinations} places`} mode={mode} />
          <InfoRow icon="briefcase" label="Upcoming trips" value={`${stats.upcomingTrips} trips`} mode={mode} />
          <InfoRow icon="flag" label="Completed trips" value={`${stats.completedTrips} trips`} mode={mode} />
        </View>

        <SectionTitle eyebrow="SUPPORT" title="Management" mode={mode} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={styles.supportHeader}>
            <View style={[styles.supportIcon, { backgroundColor: colors.accentSoft }]}> 
              <Feather name="headphones" size={18} color={colors.accent} />
            </View>
            <View style={styles.supportCopy}>
              <Text style={[styles.supportTitle, { color: colors.text }]}>Contact Management</Text>
              <Text style={[styles.supportText, { color: colors.muted }]}> 
                Reach the ITINE management team for account or graduation jury support.
              </Text>
            </View>
          </View>

          {MANAGEMENT_EMAILS.map((email) => (
            <TouchableOpacity
              key={email}
              activeOpacity={0.82}
              onPress={() => handleContactManagement(email)}
              style={[styles.emailRow, { backgroundColor: colors.elevated, borderColor: colors.border }]}
            >
              <Feather name="mail" size={16} color={colors.accent} />
              <Text style={[styles.emailText, { color: colors.text }]} numberOfLines={1}>
                {email}
              </Text>
              <Feather name="external-link" size={15} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <SectionTitle eyebrow="APP" title="About ITINE" mode={mode} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <SettingRow icon="navigation" label="About ITINE" value="Travel wallet and itinerary companion" mode={mode} />
          <SettingRow icon="info" label="Version" value={APP_VERSION} mode={mode} />

          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={16} color={colors.danger} />
            <Text style={[styles.logoutBtnText, { color: colors.danger }]}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingBottom: 56,
    paddingHorizontal: 20,
    paddingTop: 58,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  glowOrbTop: {
    borderRadius: 999,
    height: 320,
    position: 'absolute',
    right: -90,
    top: -110,
    width: 320,
  },
  glowOrbBottom: {
    borderRadius: 999,
    bottom: -130,
    height: 280,
    left: -90,
    position: 'absolute',
    width: 280,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 14,
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  retryBtn: {
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: {
    fontSize: 29,
    fontWeight: '900',
    marginBottom: 18,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    elevation: 8,
    overflow: 'hidden',
    padding: 18,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
  },
  heroPattern: {
    backgroundColor: 'rgba(99,102,241,0.16)',
    borderRadius: 140,
    height: 190,
    position: 'absolute',
    right: -70,
    top: -82,
    width: 190,
  },
  avatarButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  avatarImage: {
    borderRadius: 42,
    height: 84,
    width: 84,
  },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 42,
    borderWidth: 1,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  avatarInitials: {
    fontSize: 25,
    fontWeight: '900',
  },
  cameraBadge: {
    alignItems: 'center',
    borderRadius: 15,
    bottom: -2,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: -4,
    width: 30,
  },
  heroCopy: { gap: 8 },
  heroName: {
    fontSize: 25,
    fontWeight: '900',
  },
  heroEmail: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  statValue: {
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    marginBottom: 10,
    marginTop: 24,
  },
  sectionHeading: {
    fontSize: 21,
    fontWeight: '900',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 13,
    padding: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: -5,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputReadOnly: {
    opacity: 0.78,
  },
  detailRows: {
    gap: 0,
    marginTop: 2,
  },
  infoRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  rowCopy: { flex: 1 },
  rowLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  saveErrorText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveBtn: {
    alignItems: 'center',
    borderRadius: 15,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
    minHeight: 42,
  },
  settingIcon: {
    alignItems: 'center',
    borderRadius: 13,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  settingValue: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 138,
    textAlign: 'right',
  },
  supportHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  supportIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  supportCopy: { flex: 1 },
  supportTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  supportText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  emailRow: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emailText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  logoutBtn: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '900',
  },
  spacer: { height: 34 },
});
