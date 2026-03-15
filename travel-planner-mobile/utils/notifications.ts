import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { TripForReminder } from '@/types/notifications';

const TRIP_DATA_KEY = 'tripId';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request permission and return Expo push token; on deny or error return null. */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    if (!projectId) return null;
    const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenRes?.data ?? null;
  } catch {
    return null;
  }
}

async function hasPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/** Schedule "24 hours before" reminder. */
async function scheduleReminder24hBefore(
  tripId: string,
  destination: string,
  startDate: Date
): Promise<string | null> {
  const triggerDate = new Date(startDate);
  triggerDate.setDate(triggerDate.getDate() - 1);
  triggerDate.setHours(9, 0, 0, 0);
  if (triggerDate <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '✈️ Trip Reminder',
      body: `Your trip to ${destination} starts tomorrow! Don't forget to show your QR Pass.`,
      sound: true,
      data: { [TRIP_DATA_KEY]: tripId, type: 'trip_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

/** Schedule "morning of travel" reminder at 8:00 AM. */
async function scheduleReminderMorningOf(
  tripId: string,
  destination: string,
  startDate: Date
): Promise<string | null> {
  const triggerDate = new Date(startDate);
  triggerDate.setHours(8, 0, 0, 0);
  if (triggerDate <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎫 Show your QR Pass at check-in',
      body: `Show your QR Pass at check-in for your trip to ${destination}. Have a great trip!`,
      sound: true,
      data: { [TRIP_DATA_KEY]: tripId, type: 'qr_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

/** Cancel all scheduled notifications for a trip, then schedule 24h and morning reminders. */
export async function scheduleTripReminder(trip: TripForReminder): Promise<void> {
  await cancelTripReminders(trip.tripId);
  const granted = await hasPermission();
  if (!granted) return;

  const startDate = new Date(trip.startDate);
  if (isNaN(startDate.getTime()) || startDate <= new Date()) return;

  await scheduleReminder24hBefore(trip.tripId, trip.destination, startDate);
  await scheduleReminderMorningOf(trip.tripId, trip.destination, startDate);
}

/** Cancel all scheduled notifications for a trip. */
export async function cancelTripReminders(tripId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      const data = n.content?.data as Record<string, unknown> | undefined;
      if (data?.[TRIP_DATA_KEY] === tripId) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {
    // ignore
  }
}

/** Cancel all scheduled notifications (e.g. on logout). */
export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}
