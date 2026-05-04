import { Tabs, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { UnreadBadge } from "@/components/UnreadBadge";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getUnreadCount } from "@/utils/notificationStore";
import { loadUserPreferences } from "@/utils/userPreferences";
import { useBiometricLock } from "@/hooks/useBiometricLock";
import { BiometricGate } from "@/components/BiometricGate";
import { theme } from "@/constants/theme";

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const { lockState, unlock, isLocked } = useBiometricLock();

  useEffect(() => {
    loadUserPreferences().then((prefs) => {
      setBiometricEnabled(prefs.biometricLogin);
      setPrefsLoaded(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      getUnreadCount().then(setUnreadCount);
    }, []),
  );

  if (!prefsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const tabs = (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.subtext,
        tabBarStyle: {
          backgroundColor: "#0d0d14",
          borderTopColor: "rgba(255,255,255,0.06)",
          borderTopWidth: 1,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "My Trips",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="map.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color }) => (
            <View>
              <IconSymbol size={28} name="bell.fill" color={color} />
              <UnreadBadge count={unreadCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );

  if (!biometricEnabled) return tabs;

  return (
    <BiometricGate isLocked={isLocked} lockState={lockState} onUnlock={unlock}>
      {tabs}
    </BiometricGate>
  );
}
