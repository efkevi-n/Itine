import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getAccessToken } from '@/utils/auth';
import { hasSeenOnboarding } from '@/utils/onboarding';

const GREEN = '#10B981';

export default function BootstrapScreen() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [seen, token] = await Promise.all([hasSeenOnboarding(), getAccessToken()]);
      if (cancelled) return;

      if (!seen) {
        router.replace('/onboarding');
        return;
      }
      if (token) {
        router.replace('/(tabs)');
        return;
      }
      router.replace('/login');
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={styles.screen}>
      <ActivityIndicator size="large" color={GREEN} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F6',
  },
});
