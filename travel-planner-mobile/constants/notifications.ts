import type { NotificationType } from '@/types/notification';

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  trip_confirmed: '✅',
  trip_reminder: '✈️',
  checkin_reminder: '🎫',
  flight_reminder: '🛫',
  qr_scanned: '📱',
  trip_completed: '🏁',
};

export const NOTIFICATION_ROUTES: Record<NotificationType, string> = {
  trip_confirmed: '/qr-pass',
  trip_reminder: '/trip-detail',
  checkin_reminder: '/qr-pass',
  flight_reminder: '/trip-detail',
  qr_scanned: '/trip-detail',
  trip_completed: '/trip-detail',
};

export const MAX_NOTIFICATIONS = 50;
