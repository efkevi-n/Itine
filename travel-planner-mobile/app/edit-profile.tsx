import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { userApi } from '@/api/user';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { mapProfileToView } from '@/utils/profileMappers';
import { showToast } from '@/utils/toastStore';
import { getErrorMessage } from '@/utils/errorHandler';
import { SUCCESS_MESSAGES } from '@/constants/errors';
import { theme } from '@/constants/theme';
import type { ProfileView } from '@/types/user';

export default function EditProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await userApi.getProfile();
        const view = mapProfileToView((res.data ?? {}) as Record<string, unknown>);
        setProfile(view);
        setName(view.name);
        setPhone(view.phone);
      } catch {
        // allow editing with empty fields if load fails
      } finally {
        setLoading(false);
      }
    })();
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
      setProfile(mapProfileToView((res.data ?? {}) as Record<string, unknown>));
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
      router.back();
    } catch (e: unknown) {
      setSaveError(getErrorMessage(e));
    } finally {
      setSaveLoading(false);
    }
  }, [name, phone, router]);

  return (
    <View style={styles.screen}>
      <View style={styles.glowOrbTop} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={18} color={theme.colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.eyebrow}>ACCOUNT</Text>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your personal details</Text>
          <View style={styles.divider} />

          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
          ) : (
            <>
              <ProfileAvatar
                photoUrl={profile?.photoUrl ?? null}
                name={profile?.name}
                onPress={handlePhotoPress}
                uploadLoading={uploadLoading}
              />
              <TouchableOpacity onPress={handlePhotoPress} style={styles.changePhotoBtn}>
                <Text style={styles.changePhotoText}>Change photo</Text>
              </TouchableOpacity>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Personal info</Text>
                <View style={styles.cardDivider} />

                <Text style={styles.fieldLabel}>Full name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={theme.colors.subtext}
                  autoCapitalize="words"
                />

                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={[styles.input, styles.inputReadOnly]}
                  value={profile?.email ?? ''}
                  editable={false}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.subtext}
                />

                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  placeholderTextColor={theme.colors.subtext}
                  keyboardType="phone-pad"
                />
              </View>

              {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}

              <TouchableOpacity
                style={[styles.saveBtn, saveLoading && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saveLoading}
                activeOpacity={0.9}
              >
                {saveLoading ? (
                  <ActivityIndicator color={theme.colors.text} />
                ) : (
                  <Text style={styles.saveBtnText}>Save changes</Text>
                )}
              </TouchableOpacity>
            </>
          )}
          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  glowOrbTop: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    opacity: 0.08,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 60 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 48,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backText: { color: theme.colors.primary, fontSize: 15, fontWeight: '600' },
  eyebrow: {
    fontSize: 10,
    color: theme.colors.subtext,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: theme.colors.subtext, marginBottom: 16 },
  divider: { height: 1, backgroundColor: theme.colors.divider, marginBottom: 24 },
  loader: { marginTop: 48 },
  changePhotoBtn: { alignSelf: 'center', marginBottom: 24 },
  changePhotoText: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  cardDivider: { height: 1, backgroundColor: theme.colors.divider, marginTop: 12, marginBottom: 16 },
  fieldLabel: {
    fontSize: 10,
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  inputReadOnly: { opacity: 0.5 },
  saveError: { color: theme.colors.error, textAlign: 'center', marginBottom: 12, fontSize: 14 },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: theme.colors.text, fontWeight: '700', fontSize: 16 },
  spacer: { height: 40 },
});
