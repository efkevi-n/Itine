import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { extractUploadedPhotoUrl, userApi } from '@/api/user';
import { ProfileAvatar } from '@/components/ProfileAvatar';
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
import { useRequireAuth } from '@/hooks/useRequireAuth';
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

const BG = '#F8F8F6';
const TEXT = '#111827';
const GREEN = '#10B981';
const MUTED = '#6B7280';
const BORDER = '#F9FAFB';
const CARD_BORDER = '#F9FAFB';

const defaultMeta: ProfileMeta = {
  role: 'Traveler',
  status: 'Active account',
  university: 'Not added',
  studentId: 'Not added',
  memberSince: 'Recently joined',
  travelStyle: 'Budget Traveler',
  language: 'English',
  themePreference: 'System default',
};

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 10,
  elevation: 2,
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

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function MenuDivider() {
  return <View style={styles.menuDivider} />;
}

function PerforatedDivider() {
  return <View style={styles.perforatedWrap}>
    <View style={styles.perforatedLine} />
  </View>;
}

function MenuRow({
  icon,
  label,
  subtitle,
  onPress,
  iconVariant = 'green',
}: {
  icon: FeatherName;
  label: string;
  subtitle?: string;
  onPress: () => void;
  iconVariant?: 'green' | 'neutral';
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.menuRowLeft}>
        <View
          style={[
            styles.menuIcon,
            iconVariant === 'green' ? styles.menuIconGreen : styles.menuIconNeutral,
          ]}
        >
          <Feather name={icon} size={16} color={iconVariant === 'green' ? GREEN : TEXT} />
        </View>
        <View style={styles.menuCopy}>
          <Text style={styles.menuLabel}>{label}</Text>
          {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Feather name="chevron-right" size={14} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

function MenuCard({ children }: { children: React.ReactNode }) {
  return <View style={[styles.menuCard, CARD_SHADOW]}>{children}</View>;
}

function pickBudgetTripId(payload: unknown): string | null {
  const list = getRawList(payload);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const raw of list) {
    const status = String(raw.status ?? '').toUpperCase();
    if (status === 'CANCELLED') continue;
    const id = String(raw.id ?? raw.tripId ?? '');
    if (!id) continue;
    if (status === 'ACTIVE' || status === 'CONFIRMED' || status === 'PENDING') return id;
  }

  for (const raw of list) {
    const status = String(raw.status ?? '').toUpperCase();
    if (status === 'CANCELLED') continue;
    const id = String(raw.id ?? raw.tripId ?? '');
    if (id) return id;
  }

  return null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useRequireAuth();

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
  const [showPersonalEdit, setShowPersonalEdit] = useState(false);
  const [showTravelPrefs, setShowTravelPrefs] = useState(false);
  const [budgetTripId, setBudgetTripId] = useState<string | null>(null);

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
      setBudgetTripId(pickBudgetTripId(tripsRes.data));
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const uploadPhoto = useCallback(async (uri: string) => {
    setUploadLoading(true);
    setSaveError(null);
    try {
      const response = await userApi.uploadPhoto(uri);
      const avatarUrl = extractUploadedPhotoUrl(response.data);
      if (avatarUrl) {
        setProfile((prev) => {
          const base = prev ?? { name: '', email: '', phone: '', photoUrl: null };
          return { ...base, photoUrl: avatarUrl };
        });
      } else {
        const res = await userApi.getProfile();
        const raw = (res.data ?? {}) as RawRecord;
        setProfile(mapProfileToView(raw));
        setProfileMeta(deriveProfileMeta(raw));
      }
    } catch (e: unknown) {
      const message = getErrorMessage(e) || 'Failed to upload photo. Please try again.';
      showToast('error', message);
    } finally {
      setUploadLoading(false);
    }
  }, []);

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

    if (!result.canceled && result.assets[0]?.uri) {
      await uploadPhoto(result.assets[0].uri);
    }
  }, [uploadPhoto]);

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

  const handleHelpSupport = useCallback(() => {
    Alert.alert('Help & Support', 'Contact ITINE management', [
      ...MANAGEMENT_EMAILS.map((email) => ({
        text: email,
        onPress: () => handleContactManagement(email),
      })),
      { text: `About · ${APP_VERSION}`, style: 'default' as const },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, [handleContactManagement]);

  const handlePaymentBudget = useCallback(() => {
    if (budgetTripId) {
      router.push({ pathname: '/budget-breakdown', params: { tripId: budgetTripId } });
      return;
    }
    Alert.alert('No trips yet', 'Plan a trip to view your budget breakdown.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Plan a trip', onPress: () => router.push('/new-trip') },
    ]);
  }, [budgetTripId, router]);

  const handlePrivacySecurity = useCallback(() => {
    Alert.alert(
      'Privacy & Security',
      `Appearance: ${profileMeta.themePreference}\nStatus: ${profileMeta.status}\nMember since: ${profileMeta.memberSince}`,
    );
  }, [profileMeta.memberSince, profileMeta.status, profileMeta.themePreference]);

  const currentProfile = useMemo<ProfileView>(
    () => profile ?? { name: '', email: '', phone: '', photoUrl: null },
    [profile],
  );
  const displayName = useMemo(() => getDisplayName(currentProfile), [currentProfile]);
  if (loading && !profile) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.pageTitle}>Profile</Text>

          <View style={styles.profileHero}>
            <ProfileAvatar
              photoUrl={currentProfile.photoUrl}
              name={displayName}
              onPress={handlePhotoPress}
              uploadLoading={uploadLoading}
            />

            <Text style={styles.displayName}>{displayName}</Text>
            <View style={styles.travelBadge}>
              <Feather name="navigation" size={11} color={GREEN} />
              <Text style={styles.travelBadgeText}>{profileMeta.travelStyle}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {showPersonalEdit ? (
            <View style={[styles.editCard, CARD_SHADOW]}>
              <Text style={styles.editCardTitle}>Personal Information</Text>
              <Text style={styles.inputLabel}>Full name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputReadOnly]}
                value={currentProfile.email}
                editable={false}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
              <View style={styles.metaList}>
                <Text style={styles.metaLine}>University · {profileMeta.university}</Text>
                <Text style={styles.metaLine}>Student ID · {profileMeta.studentId}</Text>
                <Text style={styles.metaLine}>Member since · {profileMeta.memberSince}</Text>
              </View>
              {saveError ? <Text style={styles.saveErrorText}>{saveError}</Text> : null}
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saveLoading}
                activeOpacity={0.9}
              >
                {saveLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save profile</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {showTravelPrefs ? (
            <View style={[styles.editCard, CARD_SHADOW]}>
              <Text style={styles.editCardTitle}>Travel Preferences</Text>
              <Text style={styles.metaLine}>Style · {profileMeta.travelStyle}</Text>
              <Text style={styles.metaLine}>Language · {profileMeta.language}</Text>
              <Text style={styles.metaLine}>Appearance · {profileMeta.themePreference}</Text>
              <Text style={styles.metaLine}>Role · {profileMeta.role}</Text>
              <Text style={styles.metaLine}>Upcoming trips · {stats.upcomingTrips}</Text>
              <Text style={styles.metaLine}>Completed trips · {stats.completedTrips}</Text>
              <Text style={styles.metaLine}>Saved destinations · {stats.savedDestinations}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionLabel>Account</SectionLabel>
            <MenuCard>
              <MenuRow
                icon="user"
                label="Personal Information"
                onPress={() => {
                  setShowTravelPrefs(false);
                  setShowPersonalEdit((v) => !v);
                }}
              />
              <MenuDivider />
              <MenuRow
                icon="sliders"
                label="Travel Preferences"
                onPress={() => {
                  setShowPersonalEdit(false);
                  setShowTravelPrefs((v) => !v);
                }}
              />
            </MenuCard>
          </View>

          <View style={styles.section}>
            <SectionLabel>Finance</SectionLabel>
            <MenuCard>
              <MenuRow
                icon="credit-card"
                label="Payment & Budget"
                subtitle="View trip budget breakdown"
                onPress={handlePaymentBudget}
              />
              <PerforatedDivider />
              <MenuRow
                icon="link"
                label="Connected Accounts"
                subtitle="Uber, Airbnb, etc."
                onPress={() => Alert.alert('Connected Accounts', 'Account linking is coming soon.')}
              />
            </MenuCard>
          </View>

          <View style={styles.section}>
            <SectionLabel>More</SectionLabel>
            <MenuCard>
              <MenuRow
                icon="shield"
                label="Privacy & Security"
                onPress={handlePrivacySecurity}
                iconVariant="neutral"
              />
              <MenuDivider />
              <MenuRow
                icon="help-circle"
                label="Help & Support"
                onPress={handleHelpSupport}
                iconVariant="neutral"
              />
            </MenuCard>
          </View>

          <TouchableOpacity style={[styles.logoutBtn, CARD_SHADOW]} onPress={handleLogout} activeOpacity={0.88}>
            <Feather name="log-out" size={16} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { fontSize: 14, marginTop: 14, color: MUTED },
  errorText: { marginBottom: 16, textAlign: 'center', color: '#EF4444' },
  retryBtn: {
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: GREEN,
  },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT,
    alignSelf: 'flex-start',
    width: '100%',
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  profileHero: { alignItems: 'center', width: '100%' },
  displayName: { fontSize: 20, fontWeight: '700', color: TEXT, marginBottom: 8 },
  travelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  travelBadgeText: { fontSize: 12, fontWeight: '600', color: GREEN },
  body: { paddingHorizontal: 24, paddingTop: 24, gap: 0 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuIconGreen: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  menuIconNeutral: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: BORDER },
  menuCopy: { flex: 1, minWidth: 0 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: TEXT },
  menuSubtitle: { fontSize: 10, color: MUTED, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },
  perforatedWrap: { paddingHorizontal: 16 },
  perforatedLine: {
    height: 1,
    backgroundColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
    marginBottom: 24,
    gap: 10,
  },
  editCardTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 4 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: 15,
    fontWeight: '500',
    color: TEXT,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputReadOnly: { opacity: 0.75 },
  metaList: { gap: 6, marginTop: 4 },
  metaLine: { fontSize: 13, color: MUTED, fontWeight: '500' },
  saveErrorText: { fontSize: 13, color: '#EF4444', textAlign: 'center', fontWeight: '600' },
  saveBtn: {
    marginTop: 8,
    backgroundColor: GREEN,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FEF2F2',
    marginTop: 4,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
