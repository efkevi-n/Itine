import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { UserAvatar } from '@/components/UserAvatar';

const GREEN = '#10B981';

interface ProfileAvatarProps {
  photoUrl: string | null;
  name?: string;
  onPress: () => void;
  uploadLoading: boolean;
}

export function ProfileAvatar({ photoUrl, name, onPress, uploadLoading }: ProfileAvatarProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={uploadLoading}
      activeOpacity={0.9}
    >
      <View style={styles.avatarRing}>
        <UserAvatar photoUrl={photoUrl} name={name} size={88} />
        {uploadLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={GREEN} />
          </View>
        ) : null}
      </View>
      <View style={styles.cameraBtn}>
        {uploadLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Feather name="camera" size={14} color="#fff" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 10,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: { position: 'relative', marginBottom: 16 },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  cameraBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GREEN,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});
