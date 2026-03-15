import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import type { BiometricStatus } from '@/types/biometric';
import { getBiometricStatus } from '@/utils/biometricAuth';
import { BIOMETRIC_STRINGS } from '@/constants/biometric';
import { theme } from '@/constants/theme';

interface BiometricGateProps {
  isLocked: boolean;
  lockState: 'locked' | 'unlocked' | 'authenticating';
  onUnlock: () => Promise<{ success: boolean; error?: string }>;
  children: React.ReactNode;
}

export function BiometricGate({ isLocked, lockState, onUnlock, children }: BiometricGateProps) {
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>('not_available');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isLocked) {
      setAuthError(null);
      getBiometricStatus().then(setBiometricStatus);
    }
  }, [isLocked]);

  const handleUnlock = async () => {
    setAuthError(null);
    const result = await onUnlock();
    if (!result.success && result.error) {
      setAuthError(BIOMETRIC_STRINGS.AUTH_FAILED);
    }
  };

  if (!isLocked) return <>{children}</>;

  const showPinFallback = biometricStatus === 'not_available' || biometricStatus === 'not_enrolled';
  const isAuthenticating = lockState === 'authenticating';

  return (
    <View style={styles.container}>
      <Text style={styles.lockIcon}>🔒</Text>
      <Text style={styles.title}>{BIOMETRIC_STRINGS.LOCK_TITLE}</Text>
      {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
      {isAuthenticating ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
      ) : (
        <>
          {!showPinFallback && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleUnlock}>
              <Text style={styles.primaryBtnText}>{BIOMETRIC_STRINGS.UNLOCK_BIOMETRIC}</Text>
            </TouchableOpacity>
          )}
          {showPinFallback && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleUnlock}>
              <Text style={styles.primaryBtnText}>{BIOMETRIC_STRINGS.UNLOCK_PIN}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.radius.lg,
    minHeight: 280,
  },
  lockIcon: {
    fontSize: 64,
    marginBottom: theme.radius.lg,
  },
  title: {
    fontSize: theme.fonts.large,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.radius.md,
  },
  errorText: {
    fontSize: theme.fonts.regular,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.radius.md,
  },
  spinner: {
    marginTop: theme.radius.md,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.radius.md,
    paddingHorizontal: theme.radius.lg,
    marginTop: theme.radius.sm,
    minWidth: 260,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: theme.fonts.medium,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
