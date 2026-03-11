import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request permission from user
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

// Schedule "Your trip starts tomorrow" — 24 hours before start date
export async function scheduleTripReminderNotification(
  destination: string,
  startDate: Date
): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const triggerDate = new Date(startDate);
  triggerDate.setDate(triggerDate.getDate() - 1); // 24 hours before
  triggerDate.setHours(9, 0, 0, 0); // 9:00 AM the day before

  // Don't schedule if date is in the past
  if (triggerDate <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '✈️ Trip Reminder',
      body: `Your trip to ${destination} starts tomorrow! Get ready to go.`,
      sound: true,
      data: { type: 'trip_reminder', destination },
    },
    trigger: {
      date: triggerDate,
    },
  });

  return id;
}

// Schedule "Show your QR Pass at check-in" — morning of travel day
export async function scheduleQRPassNotification(
  destination: string,
  startDate: Date
): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const triggerDate = new Date(startDate);
  triggerDate.setHours(6, 0, 0, 0); // 6:00 AM on travel day

  // Don't schedule if date is in the past
  if (triggerDate <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎫 Time to Travel!',
      body: `Show your QR Pass at check-in for your trip to ${destination}. Have a great trip!`,
      sound: true,
      data: { type: 'qr_reminder', destination },
    },
    trigger: {
      date: triggerDate,
    },
  });

  return id;
}

// Schedule both notifications for a trip
export async function scheduleAllTripNotifications(
  destination: string,
  startDate: Date
): Promise<void> {
  await scheduleTripReminderNotification(destination, startDate);
  await scheduleQRPassNotification(destination, startDate);
  console.log(`Notifications scheduled for trip to ${destination}`);
}

// Cancel all scheduled notifications for a trip
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get all scheduled notifications (for debugging)
export async function getScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}