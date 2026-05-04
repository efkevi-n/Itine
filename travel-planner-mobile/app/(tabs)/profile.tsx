import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { userApi } from '@/api/user';
import { authApi } from '@/api/auth';
import { cancelAllReminders } from '@/utils/notifications';
import { clearAllNotifications } from '@/utils/notificationStore';
import { clearTokens } from '@/utils/auth';
import { ProfileIdentitySection } from '@/components/ProfileIdentitySection';
import { ProfileStats } from '@/components/ProfileStats';
import { ProfilePreferences } from '@/components/ProfilePreferences';
import { ProfileSupport } from '@/components/ProfileSupport';
import { ProfileDangerZone } from '@/components/ProfileDangerZone';
import { ProfileErrorState, ProfileLoadingState } from '@/components/ProfileScreenStates';
import { mapProfileToView } from '@/utils/profileMappers';
import { showToast } from '@/utils/toastStore';
import { getErrorMessage } from '@/utils/errorHandler';
import { SUCCESS_MESSAGES } from '@/constants/errors';
import { profileStyles } from '@/constants/profileScreenStyles';
import type { ProfileView } from '@/types/user';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await userApi.getProfile();
      setProfile(mapProfileToView((res.data ?? {}) as Record<string, unknown>));
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

  const handleLogout = useCallback(async () => {
    await cancelAllReminders();
    await clearAllNotifications();
    try {
      await authApi.logout();
    } catch {
      // clear local state regardless
    }
    await clearTokens();
    showToast('success', SUCCESS_MESSAGES.LOGGED_OUT);
    router.replace('/login');
  }, [router]);

  if (loading && !profile) return <ProfileLoadingState />;
  if (error && !profile) return <ProfileErrorState message={error} onRetry={loadProfile} />;

  const currentProfile = profile ?? { name: '', email: '', phone: '', photoUrl: null };

  return (
    <View style={profileStyles.screen}>
      <View style={profileStyles.glowOrbTop} />
      <View style={profileStyles.glowOrbBottom} />

      <ScrollView
        style={profileStyles.scroll}
        contentContainerStyle={profileStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={profileStyles.eyebrow}>PROFILE</Text>
        <Text style={profileStyles.title}>My Profile</Text>
        <Text style={profileStyles.subtitle}>Manage your account details</Text>
        <View style={profileStyles.headerDivider} />

        <ProfileIdentitySection profile={currentProfile} />
        <ProfileStats />
        <ProfilePreferences />
        <ProfileSupport />

        <TouchableOpacity style={profileStyles.logoutBtn} onPress={handleLogout}>
          <Text style={profileStyles.logoutBtnText}>Log out</Text>
        </TouchableOpacity>

        <ProfileDangerZone />
        <View style={profileStyles.spacer} />
      </ScrollView>
    </View>
  );
}
