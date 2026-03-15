import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { userApi } from '@/api/user';
import { authApi } from '@/api/auth';
import { cancelAllReminders } from '@/utils/notifications';
import { clearAllNotifications } from '@/utils/notificationStore';
import { clearTokens } from '@/utils/auth';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { ProfileForm } from '@/components/ProfileForm';
import type { ProfileView } from '@/types/user';
import { mapProfileToView } from '@/utils/profileMappers';
import { showToast } from '@/utils/toastStore';
import { getErrorMessage } from '@/utils/errorHandler';
import { SUCCESS_MESSAGES } from '@/constants/errors';
import { theme } from '@/constants/theme';

const APP_VERSION = 'AI Travel Planner v1.0.0';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileView | null>(null);
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
      const res = await userApi.getProfile();
      const raw = (res.data ?? {}) as Record<string, unknown>;
      const view = mapProfileToView(raw);
      setProfile(view);
      setName(view.name);
      setPhone(view.phone);
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setUploadLoading(true);
    setSaveError(null);
    try {
      const asset = result.assets[0];
      const uri = asset.uri;
      const formData = new FormData();
      formData.append('file', { uri, type: asset.mimeType ?? 'image/jpeg', name: 'photo.jpg' } as unknown as Blob);
      await userApi.uploadPhoto(formData);
      const res = await userApi.getProfile();
      const view = mapProfileToView((res.data ?? {}) as Record<string, unknown>);
      setProfile(view);
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
      setProfile(mapProfileToView((res.data ?? {}) as Record<string, unknown>));
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

  if (loading && !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentProfile = profile ?? { name: '', email: '', phone: '', photoUrl: null };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <ProfileAvatar
        photoUrl={currentProfile.photoUrl}
        onPress={handlePhotoPress}
        uploadLoading={uploadLoading}
      />
      <ProfileForm
        name={name}
        email={currentProfile.email}
        phone={phone}
        onChangeName={setName}
        onChangePhone={setPhone}
      />
      {saveError ? <Text style={styles.saveErrorText}>{saveError}</Text> : null}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saveLoading}>
        {saveLoading ? <ActivityIndicator color={theme.colors.background} /> : <Text style={styles.saveBtnText}>Save changes</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Log out</Text>
      </TouchableOpacity>
      <Text style={styles.version}>{APP_VERSION}</Text>
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.text, marginTop: 60, marginBottom: 8 },
  loadingText: { color: theme.colors.subtext, marginTop: 12 },
  errorText: { color: theme.colors.error, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  retryBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 16 },
  saveErrorText: { color: theme.colors.error, marginBottom: 8, textAlign: 'center' },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 16 },
  logoutBtn: { backgroundColor: theme.colors.card, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 24 },
  logoutBtnText: { color: '#f87171', fontWeight: '600', fontSize: 16 },
  version: { color: theme.colors.subtext, fontSize: 12, textAlign: 'center' },
  spacer: { height: 40 },
});
