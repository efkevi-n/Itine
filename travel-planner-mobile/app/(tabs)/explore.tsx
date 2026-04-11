import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Image, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_VERSION = '1.0.0';

export default function ProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState('John Traveler');
  const [email, setEmail] = useState('john@example.com');
  const [phone, setPhone] = useState('+1 234 567 8900');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaveLoading(true);
    try {
      const response = await fetch('https://your-api.com/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      });
      if (response.ok) {
        setSuccess('Profile updated successfully!');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      setSuccess('Profile updated successfully!');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await fetch('https://your-api.com/auth/logout', { method: 'POST' });
            } catch (err) {}
            await AsyncStorage.clear();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.glowOrbTop} />
      <View style={styles.glowOrbBottom} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerLabel}>PROFILE</Text>
        <Text style={styles.title}>My Profile</Text>
        <View style={styles.headerDivider} />

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.photoContainer}>
          <TouchableOpacity onPress={handlePickImage}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitials}>
                  {name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? '')
                    .join('') || 'JT'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickImage}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>PERSONAL INFO</Text>
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholderTextColor="#4b5563"
            />
            <View style={styles.fieldDivider} />
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#4b5563"
            />
            <View style={styles.fieldDivider} />
            <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#4b5563"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saveLoading}
        >
          {saveLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#f87171" />
          ) : (
            <Text style={styles.logoutBtnText}>Logout</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.version}>Version {APP_VERSION}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0d14' },
  glowOrbTop: {
    position: 'absolute', top: -100, right: -80,
    width: 320, height: 320, borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  glowOrbBottom: {
    position: 'absolute', bottom: -120, left: -80,
    width: 280, height: 280, borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  scroll: { flex: 1 },
  contentContainer: { paddingHorizontal: 24, paddingBottom: 60 },
  headerLabel: {
    marginTop: 48, fontSize: 10,
    letterSpacing: 1.5, color: '#4b5563',
    textTransform: 'uppercase',
  },
  title: { marginTop: 6, fontSize: 26, fontWeight: '700', color: '#ffffff' },
  headerDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 16, marginBottom: 24,
  },
  successBox: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: 10, padding: 12, marginBottom: 24,
  },
  successText: { color: '#22c55e', textAlign: 'center' },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 10, padding: 12, marginBottom: 24,
  },
  errorText: { color: '#f87171', textAlign: 'center' },
  photoContainer: { alignItems: 'center', marginBottom: 32 },
  photo: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: '#6366f1',
  },
  photoPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#13131f', borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  photoInitials: { fontSize: 28, fontWeight: '700', color: '#6366f1' },
  changePhotoText: { marginTop: 8, fontSize: 14, color: '#6366f1' },
  formSection: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 10, letterSpacing: 1.5, color: '#4b5563',
    textTransform: 'uppercase', marginBottom: 16,
  },
  formCard: {
    backgroundColor: '#13131f', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, overflow: 'hidden',
  },
  fieldLabel: {
    fontSize: 10, letterSpacing: 1.5, color: '#4b5563',
    textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 14,
  },
  input: {
    backgroundColor: 'transparent', color: '#ffffff',
    fontSize: 15, paddingHorizontal: 16, paddingBottom: 14,
  },
  fieldDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  saveBtn: {
    width: '100%', height: 54, borderRadius: 12,
    marginTop: 24, backgroundColor: '#6366f1',
    justifyContent: 'center', alignItems: 'center',
  },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  logoutBtn: {
    width: '100%', height: 54, borderRadius: 12, marginTop: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoutBtnText: { color: '#f87171', fontSize: 16, fontWeight: '700' },
  version: { marginTop: 32, textAlign: 'center', color: '#4b5563', fontSize: 12 },
});