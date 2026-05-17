import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppNotification, NotificationType } from '@/types/notification';
import { formatNotificationTime } from '@/utils/timeAgo';

const TEXT = '#111827';
const GREEN = '#10B981';
const GREY = '#6B7280';

type FeatherIcon = React.ComponentProps<typeof Feather>['name'];

const TYPE_ICONS: Record<NotificationType, FeatherIcon> = {
  trip_confirmed: 'grid',
  trip_reminder: 'calendar',
  checkin_reminder: 'navigation',
  flight_reminder: 'navigation',
  qr_scanned: 'grid',
  trip_completed: 'check-circle',
};

const GREEN_ICON_TYPES: NotificationType[] = ['checkin_reminder', 'flight_reminder'];

interface NotificationItemProps {
  notification: AppNotification;
  sectionLabel: string;
  onPress: () => void;
  onDelete: () => void;
}

function getAction(notification: AppNotification): { label: string; primary: boolean } | null {
  if (notification.type === 'checkin_reminder' || notification.type === 'flight_reminder') {
    return { label: 'Check-in Now', primary: true };
  }
  if (notification.type === 'trip_confirmed') {
    return { label: 'View QR Pass', primary: false };
  }
  return null;
}

export function NotificationItem({ notification, sectionLabel, onPress, onDelete }: NotificationItemProps) {
  const iconName = TYPE_ICONS[notification.type] ?? 'bell';
  const isGreenIcon = GREEN_ICON_TYPES.includes(notification.type);
  const timeLabel = formatNotificationTime(notification.createdAt, sectionLabel);
  const action = getAction(notification);
  const isUnread = !notification.isRead;

  const handleLongPress = () => {
    Alert.alert('Delete notification', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isUnread ? styles.cardUnread : styles.cardRead,
        !isUnread && styles.cardReadMuted,
      ]}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.88}
    >
      {isUnread ? <View style={styles.unreadDot} /> : null}

      <View style={styles.row}>
        <View style={[styles.iconWrap, isGreenIcon && styles.iconWrapGreen]}>
          <Feather name={iconName} size={18} color={isGreenIcon ? GREEN : TEXT} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles.time}>{timeLabel}</Text>
          </View>
          <Text style={[styles.body, action && styles.bodyWithAction]} numberOfLines={3}>
            {notification.body}
          </Text>

          {action ? (
            <TouchableOpacity
              style={[styles.actionBtn, action.primary ? styles.actionPrimary : styles.actionSecondary]}
              onPress={onPress}
              activeOpacity={0.85}
            >
              <Text style={[styles.actionText, action.primary ? styles.actionTextPrimary : styles.actionTextSecondary]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    position: 'relative',
  },
  cardUnread: {
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  cardRead: {
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  cardReadMuted: {
    opacity: 0.75,
  },
  unreadDot: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GREEN,
    borderWidth: 4,
    borderColor: '#fff',
    zIndex: 2,
  },
  row: { flexDirection: 'row', gap: 16 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'transparent',
  },
  content: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: TEXT },
  time: { fontSize: 10, fontWeight: '500', color: GREY },
  body: { fontSize: 12, color: GREY, lineHeight: 18 },
  bodyWithAction: { marginBottom: 12 },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  actionSecondary: {
    alignSelf: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionText: { fontSize: 12, fontWeight: '700' },
  actionTextPrimary: { color: '#fff' },
  actionTextSecondary: { color: TEXT },
});
