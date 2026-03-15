export type NotificationType =
  | 'trip_confirmed'
  | 'trip_reminder'
  | 'checkin_reminder'
  | 'flight_reminder'
  | 'qr_scanned'
  | 'trip_completed';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  tripId?: string;
  isRead: boolean;
  createdAt: string;
}
