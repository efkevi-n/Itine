import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { setUnauthorizedHandler } from '@/api/client';
import { NOTIFICATION_ROUTES } from '@/constants/notifications';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AppNotification, NotificationType } from '@/types/notification';
import { saveNotification } from '@/utils/notificationStore';
import { registerForPushNotifications } from '@/utils/notifications';

const VALID_TYPES: NotificationType[] = [
  'trip_confirmed', 'trip_reminder', 'checkin_reminder',
  'flight_reminder', 'qr_scanned', 'trip_completed',
];
const TRIP_ID_KEY = 'tripId';

function normalizeType(dataType: unknown): NotificationType {
  if (typeof dataType === 'string' && VALID_TYPES.includes(dataType as NotificationType)) {
    return dataType as NotificationType;
  }
  if (dataType === 'qr_reminder') return 'checkin_reminder';
  return 'trip_reminder';
}

export const unstable_settings = {
  initialRouteName: 'onboarding',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    setUnauthorizedHandler(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    registerForPushNotifications().catch(() => {});
  }, []);

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
      const tripId = typeof data[TRIP_ID_KEY] === 'string' ? data[TRIP_ID_KEY] : undefined;
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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}