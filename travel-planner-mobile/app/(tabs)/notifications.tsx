import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  getNotifications,
  markAllAsRead,
  deleteNotification,
} from '@/utils/notificationStore';
import { NOTIFICATION_ROUTES } from '@/constants/notifications';
import { NotificationItem } from '@/components/NotificationItem';
import type { AppNotification } from '@/types/notification';
import { theme } from '@/constants/theme';

const EMPTY_MESSAGE = 'No notifications yet 🔔';
const MARK_ALL_READ = 'Mark all as read';

export default function NotificationsScreen() {
  const router = useRouter();
  const [list, setList] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getNotifications();
    setList(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
    load();
  }, [load]);

  const handlePress = useCallback(
    (item: AppNotification) => {
      const route = NOTIFICATION_ROUTES[item.type];
      if (item.tripId && (route === '/qr-pass' || route === '/trip-detail')) {
        router.push({ pathname: route as '/qr-pass' | '/trip-detail', params: { tripId: item.tripId } });
      } else {
        router.push(route as '/trip-detail');
      }
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteNotification(id);
      setList((prev) => prev.filter((n) => n.id !== id));
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationItem
        notification={item}
        onPress={() => handlePress(item)}
        onDelete={() => handleDelete(item.id)}
      />
    ),
    [handlePress, handleDelete]
  );

  const keyExtractor = useCallback((item: AppNotification) => item.id, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {list.length > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>{MARK_ALL_READ}</Text>
          </TouchableOpacity>
        )}
      </View>
      {list.length === 0 ? (
        <View style={[styles.centered, styles.emptyContainer]}>
          <Text style={styles.emptyText}>{EMPTY_MESSAGE}</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.radius.lg,
    paddingTop: 60,
    paddingBottom: theme.radius.md,
  },
  title: {
    fontSize: theme.fonts.title,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  markAllBtn: {
    paddingVertical: theme.radius.sm,
    paddingHorizontal: theme.radius.md,
  },
  markAllText: {
    fontSize: theme.fonts.regular,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: theme.fonts.medium,
    color: theme.colors.subtext,
  },
  listContent: {
    paddingBottom: theme.radius.lg,
  },
});
