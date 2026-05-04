import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';
import { profileStyles } from '@/constants/profileScreenStyles';

export function ProfileLoadingState() {
  return (
    <View style={[profileStyles.screen, profileStyles.centered]}>
      <View style={profileStyles.glowOrbTop} />
      <View style={profileStyles.glowOrbBottom} />
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={profileStyles.loadingText}>Loading profile...</Text>
    </View>
  );
}

type ProfileErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function ProfileErrorState({ message, onRetry }: ProfileErrorStateProps) {
  return (
    <View style={[profileStyles.screen, profileStyles.centered]}>
      <View style={profileStyles.glowOrbTop} />
      <View style={profileStyles.glowOrbBottom} />
      <Text style={profileStyles.errorText}>{message}</Text>
      <TouchableOpacity style={profileStyles.retryBtn} onPress={onRetry}>
        <Text style={profileStyles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
