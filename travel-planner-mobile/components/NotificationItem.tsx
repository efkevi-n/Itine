import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { AppNotification } from '@/types/notification';
import { NOTIFICATION_ICONS } from '@/constants/notifications';
import { timeAgo } from '@/utils/timeAgo';
import { theme } from '@/constants/theme';

interface NotificationItemProps {
  notification: AppNotification;
  onPress: () => void;
  onDelete: () => void;
}

export function NotificationItem({ notification, onPress, onDelete }: NotificationItemProps) {
  const icon = NOTIFICATION_ICONS[notification.type] ?? '🔔';
  const timeLabel = timeAgo(notification.createdAt);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        {!notification.isRead && <View style={styles.unreadDot} />}
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
          <Text style={styles.time}>{timeLabel}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.radius.sm,
    paddingHorizontal: theme.radius.md,
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.radius.md,
    marginBottom: theme.radius.sm,
    borderRadius: theme.radius.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: theme.radius.sm,
  },
  icon: {
    fontSize: theme.fonts.large,
    marginRight: theme.radius.sm,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: theme.fonts.medium,
    fontWeight: '600',
    color: theme.colors.text,
  },
  body: {
    fontSize: theme.fonts.regular,
    color: theme.colors.subtext,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: theme.colors.subtext,
    marginTop: 2,
  },
  deleteBtn: {
    padding: theme.radius.sm,
  },
  deleteText: {
    fontSize: theme.fonts.regular,
    color: theme.colors.subtext,
  },
});
