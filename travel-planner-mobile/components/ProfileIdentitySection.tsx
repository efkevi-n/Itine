import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { theme } from '@/constants/theme';
import type { ProfileView } from '@/types/user';

type Props = {
  profile: ProfileView;
};

export function ProfileIdentitySection({ profile }: Props) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <ProfileAvatar
        photoUrl={profile.photoUrl}
        name={profile.name}
        onPress={() => router.push('/edit-profile')}
        uploadLoading={false}
      />

      <Text style={styles.name}>{profile.name || 'Traveller'}</Text>
      {profile.email ? <Text style={styles.detail}>{profile.email}</Text> : null}
      {profile.phone ? <Text style={styles.detail}>{profile.phone}</Text> : null}

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => router.push('/edit-profile')}
        activeOpacity={0.85}
      >
        <Feather name="edit-2" size={14} color={theme.colors.text} />
        <Text style={styles.editBtnText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    letterSpacing: -0.3,
  },
  detail: {
    color: theme.colors.subtext,
    fontSize: 14,
    marginTop: 4,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  editBtnText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
});
