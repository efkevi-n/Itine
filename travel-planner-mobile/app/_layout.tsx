import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { setUnauthorizedHandler } from '@/api/client';
import { NOTIFICATION_ROUTES } from '@/constants/notifications';
import { OFFLINE_MESSAGES } from '@/constants/offline';
import { useConnectivity } from '@/hooks/useConnectivity';
import type { AppNotification, NotificationType } from '@/types/notification';
import { handleDeepLink } from '@/utils/deepLinkHandler';
import { saveNotification } from '@/utils/notificationStore';
import { registerForPushNotifications } from '@/utils/notifications';
import { retryQueuedRequests } from '@/utils/requestQueue';
import { clearExpiredCache } from '@/utils/offlineCache';
import { theme } from '@/constants/theme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastContainer } from '@/components/ToastContainer';

const SYNC_TOAST_DURATION_MS = 3000;

const VALID_TYPES: NotificationType[] = [
  'trip_confirmed', 'trip_reminder', 'checkin_reminder',
  'flight_reminder', 'qr_scanned', 'trip_completed',
];
const TRIP_ID_KEY = 'tripId';
const JTI_KEY = 'jti';
const TYPE_KEY = 'type';

function normalizeType(dataType: unknown): NotificationType {
  if (typeof dataType === 'string' && VALID_TYPES.includes(dataType as NotificationType)) {
    return dataType as NotificationType;
  }
  if (dataType === 'qr_reminder') return 'checkin_reminder';
  return 'trip_reminder';
}

export const unstable_settings = {
  initialRouteName: 'index',
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status } = useConnectivity();
  const prevStatusRef = useRef<typeof status>(status);
  const [showSyncToast, setShowSyncToast] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    registerForPushNotifications().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    Linking.getInitialURL().then((initialUrl) => {
      if (cancelled || !initialUrl) return;
      handleDeepLink(initialUrl, router).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url, router).catch(() => {});
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    const wasOffline = prevStatusRef.current === 'offline';
    if (wasOffline && status === 'online') {
      setShowSyncToast(true);
      clearExpiredCache().catch(() => {});
      retryQueuedRequests().finally(() => {
        setTimeout(() => setShowSyncToast(false), SYNC_TOAST_DURATION_MS);
      });
    }
    prevStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    const subReceived = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      const data = (content.data ?? {}) as Record<string, unknown>;
      const type = normalizeType(data.type);
      const tripId = typeof data[TRIP_ID_KEY] === 'string' ? data[TRIP_ID_KEY] : undefined;
      const appNotif: AppNotification = {
        id: `push_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type,
        title: typeof content.title === 'string' ? content.title : 'Notification',
        body: typeof content.body === 'string' ? content.body : '',
        tripId,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      saveNotification(appNotif).catch(() => {});
    });

    const subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      const content = response.notification.request.content;
      const data = (content.data ?? {}) as Record<string, unknown>;
      const type = normalizeType(data.type);
      const dataType = typeof data[TYPE_KEY] === 'string' ? data[TYPE_KEY] : type;
      const tripId = typeof data[TRIP_ID_KEY] === 'string' ? data[TRIP_ID_KEY] : undefined;
      const jti = typeof data[JTI_KEY] === 'string' ? data[JTI_KEY] : undefined;
      const appNotif: AppNotification = {
        id: `tap_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type,
        title: typeof content.title === 'string' ? content.title : 'Notification',
        body: typeof content.body === 'string' ? content.body : '',
        tripId,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      saveNotification(appNotif).catch(() => {});
      if (dataType === 'trip_confirmed' && tripId) {
        router.push({ pathname: '/trip-detail', params: { tripId } });
        return;
      }
      if (dataType === 'qr_scanned' && jti) {
        router.push({ pathname: '/qr-pass', params: { jti } });
        return;
      }
      const route = NOTIFICATION_ROUTES[type];
      if (tripId && (route === '/qr-pass' || route === '/trip-detail')) {
        router.push({ pathname: route as '/qr-pass' | '/trip-detail', params: { tripId } });
      } else if (route) {
        router.push(route as '/trip-detail');
      }
    });

    return () => {
      subReceived.remove();
      subResponse.remove();
    };
  }, [router]);

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ToastContainer />
        {showSyncToast ? (
          <View style={[styles.syncToast, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.syncToastText}>{OFFLINE_MESSAGES.backOnlineSyncing}</Text>
          </View>
        ) : null}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="new-trip" />
          <Stack.Screen name="itinerary-review" />
          <Stack.Screen name="trip-detail" />
          <Stack.Screen name="edit-itinerary" />
          <Stack.Screen name="budget-breakdown" />
          <Stack.Screen name="privacy-security" />
          <Stack.Screen name="active-trip" />
          <Stack.Screen name="qr-pass" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  syncToast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.success,
    paddingBottom: theme.radius.sm,
    paddingHorizontal: theme.radius.md,
    zIndex: 9999,
    alignItems: 'center',
  },
  syncToastText: {
    fontSize: theme.fonts.regular,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
