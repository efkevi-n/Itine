import { Tabs, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getUnreadCount } from '@/utils/notificationStore';

const GREEN = '#10B981';
const INACTIVE = '#6B7280';

function TabIconWrap({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  if (!focused) {
    return <View style={styles.iconSlot}>{children}</View>;
  }
  return (
    <View style={[styles.iconSlot, styles.iconSlotActive]}>
      {children}
    </View>
  );
}

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      getUnreadCount().then(setUnreadCount);
    }, []),
  );

  const tabBarHeight = 64 + Math.max(insets.bottom, 16);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: INACTIVE,
        tabBarShowLabel: false,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: tabBarHeight,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingHorizontal: 24,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.03,
          shadowRadius: 20,
          elevation: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIconWrap focused={focused}>
              <IconSymbol size={22} name="house.fill" color={color} />
            </TabIconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'My Trips',
          tabBarIcon: ({ color, focused }) => (
            <TabIconWrap focused={focused}>
              <IconSymbol size={22} name="briefcase.fill" color={color} />
            </TabIconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, focused }) => (
            <TabIconWrap focused={focused}>
              <View>
                <IconSymbol size={22} name="bell.fill" color={color} />
                {unreadCount > 0 ? <View style={styles.notifDot} /> : null}
              </View>
            </TabIconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIconWrap focused={focused}>
              <IconSymbol size={22} name="person.fill" color={color} />
            </TabIconWrap>
          ),
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconSlot: {
    width: 48,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlotActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 999,
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
});
