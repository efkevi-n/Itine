import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import {
  getNotifications,
  markAllAsRead,
  markNotificationAsRead,
  deleteNotification,
} from '@/utils/notificationStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { NOTIFICATION_ROUTES } from '@/constants/notifications';
import { NotificationItem } from '@/components/NotificationItem';
import type { AppNotification } from '@/types/notification';

const BG = '#F8F8F6';
const TEXT = '#111827';
const GREEN = '#10B981';
const GREY = '#6B7280';

function getDateLabel(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (d.getTime() >= today.getTime()) return 'Today';
  if (d.getTime() >= yesterday.getTime()) return 'Yesterday';
  if (d.getTime() >= weekAgo.getTime()) return 'This Week';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
  });
}

const SECTION_ORDER = ['Today', 'Yesterday', 'This Week'];

export default function NotificationsScreen() {
  const router = useRouter();
  const { top, tabScrollBottom } = useScreenInsets();
  useRequireAuth();
  const [list, setList] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getNotifications();
    setList(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
    load();
  }, [load]);

  const handlePress = useCallback(
    async (item: AppNotification) => {
      if (!item.isRead) {
        await markNotificationAsRead(item.id);
        setList((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
      }

      const route = NOTIFICATION_ROUTES[item.type];
      if (item.tripId && (route === '/qr-pass' || route === '/trip-detail')) {
        router.push({
          pathname: route as '/qr-pass' | '/trip-detail',
          params: { tripId: item.tripId },
        });
      } else {
        router.push(route as '/trip-detail');
      }
    },
    [router],
  );

  const handleDelete = useCallback(async (id: string) => {
    await deleteNotification(id);
    setList((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = useMemo(() => list.filter((n) => !n.isRead).length, [list]);
  const displayed = useMemo(
    () => (filter === 'unread' ? list.filter((n) => !n.isRead) : list),
    [list, filter],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, AppNotification[]>();
    for (const n of displayed) {
      const label = getDateLabel(n.createdAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(n);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const ai = SECTION_ORDER.indexOf(a);
      const bi = SECTION_ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return 0;
    });
  }, [displayed]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: top }]}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.85}
          >
            <Feather name="settings" size={18} color={TEXT} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.tabs}>
            <TouchableOpacity onPress={() => setFilter('all')} activeOpacity={0.85}>
              <Text style={[styles.tab, filter === 'all' && styles.tabActive]}>All</Text>
              {filter === 'all' ? <View style={styles.tabUnderline} /> : null}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('unread')} activeOpacity={0.85}>
              <Text style={[styles.tab, filter === 'unread' && styles.tabActive]}>
                {`Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
              </Text>
              {filter === 'unread' ? <View style={styles.tabUnderline} /> : null}
            </TouchableOpacity>
          </View>

          {list.length > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.85}>
              <Text style={styles.markAll}>Mark all as read</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {displayed.length === 0 ? (
        <View style={[styles.centered, styles.emptyWrap]}>
          <View style={styles.emptyIcon}>
            <Feather name="bell" size={28} color={GREY} />
          </View>
          <Text style={styles.emptyTitle}>
            {filter === 'unread' ? 'All caught up' : 'No notifications yet'}
          </Text>
          <Text style={styles.emptyText}>
            {filter === 'unread'
              ? 'You have no unread notifications.'
              : 'Trip updates and reminders will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([label]) => label}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabScrollBottom }]}
          renderItem={({ item: [label, items] }) => (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{label}</Text>
              <View style={styles.sectionCards}>
                {items.map((item) => (
                  <NotificationItem
                    key={item.id}
                    notification={item}
                    sectionLabel={label}
                    onPress={() => handlePress(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: TEXT, lineHeight: 34 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  tabs: { flexDirection: 'row', gap: 16 },
  tab: { fontSize: 14, fontWeight: '500', color: GREY, paddingBottom: 4 },
  tabActive: { fontWeight: '700', color: TEXT },
  tabUnderline: {
    height: 2,
    backgroundColor: GREEN,
    borderRadius: 1,
    marginTop: -2,
  },
  markAll: { fontSize: 12, fontWeight: '500', color: GREEN },
  listContent: { paddingHorizontal: 24, paddingTop: 16, gap: 32 },
  section: { gap: 16, marginBottom: 8 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCards: { gap: 16 },
  emptyWrap: { flex: 1, paddingHorizontal: 32 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: GREY, textAlign: 'center', lineHeight: 20 },
});
