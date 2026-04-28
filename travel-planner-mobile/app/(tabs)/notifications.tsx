import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  getNotifications, markAllAsRead, deleteNotification,
} from '@/utils/notificationStore';
import { NOTIFICATION_ROUTES } from '@/constants/notifications';
import { NotificationItem } from '@/components/NotificationItem';
import type { AppNotification } from '@/types/notification';
import { theme } from '@/constants/theme';

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
    load();
  }, [load]);

  const handlePress = useCallback((item: AppNotification) => {
    const route = NOTIFICATION_ROUTES[item.type];
    if (item.tripId && (route === '/qr-pass' || route === '/trip-detail')) {
      router.push({ pathname: route as '/qr-pass' | '/trip-detail', params: { tripId: item.tripId } });
    } else {
      router.push(route as '/trip-detail');
    }
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteNotification(id);
    setList((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const renderItem = useCallback(({ item }: { item: AppNotification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handlePress(item)}
      onDelete={() => handleDelete(item.id)}
    />
  ), [handlePress, handleDelete]);

  const keyExtractor = useCallback((item: AppNotification) => item.id, []);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.glowOrbTop} />
      <View style={styles.glowOrbBottom} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>NOTIFICATIONS</Text>
        <Text style={styles.title}>Updates</Text>
        <View style={styles.divider} />
        {list.length > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {list.length === 0 ? (
        <View style={[styles.centered, styles.emptyContainer]}>
          <Text style={styles.emptyText}>No notifications yet</Text>
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
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  glowOrbTop: {
    position: 'absolute', top: -100, right: -80,
    width: 320, height: 320, borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  glowOrbBottom: {
    position: 'absolute', bottom: -120, left: -80,
    width: 280, height: 280, borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  header: { paddingHorizontal: 24 },
  eyebrow: {
    fontSize: 10, color: '#4b5563', letterSpacing: 1.5,
    textTransform: 'uppercase', fontWeight: '600',
    marginTop: 60, marginBottom: 8,
  },
  title: {
    fontSize: 26, fontWeight: '700',
    color: theme.colors.text, marginBottom: 16, letterSpacing: -0.3,
  },
  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 16,
  },
  markAllBtn: {
    alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
    borderRadius: 8, marginBottom: 16,
  },
  markAllText: {
    fontSize: 13, color: theme.colors.primary, fontWeight: '600',
  },
  emptyContainer: { flex: 1 },
  emptyText: { fontSize: theme.fonts.medium, color: theme.colors.subtext },
  listContent: { paddingHorizontal: 24, paddingBottom: 60 },
});