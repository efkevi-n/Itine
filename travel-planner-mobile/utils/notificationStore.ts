import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppNotification } from '@/types/notification';
import { MAX_NOTIFICATIONS } from '@/constants/notifications';

const STORAGE_KEY = 'app_notifications';

export async function getNotifications(): Promise<AppNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AppNotification[]) : [];
  } catch {
    return [];
  }
}

export async function saveNotification(notification: AppNotification): Promise<void> {
  const list = await getNotifications();
  const next = [notification, ...list].slice(0, MAX_NOTIFICATIONS);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function markAllAsRead(): Promise<void> {
  const list = await getNotifications();
  const updated = list.map((n) => ({ ...n, isRead: true }));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function deleteNotification(id: string): Promise<void> {
  const list = await getNotifications();
  const filtered = list.filter((n) => n.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function getUnreadCount(): Promise<number> {
  const list = await getNotifications();
  return list.filter((n) => !n.isRead).length;
}

export async function clearAllNotifications(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
