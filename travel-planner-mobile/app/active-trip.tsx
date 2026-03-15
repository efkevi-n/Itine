import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorToast } from "@/components/ErrorToast";
import { NextServiceBanner } from "@/components/NextServiceBanner";
import { ActiveServiceRow } from "@/components/ActiveServiceRow";
import { useActiveTripData } from "@/hooks/useActiveTripData";
import { theme } from "@/constants/theme";
import { COUNTDOWN_UPDATE_MS } from "@/constants/activeTrip";
import {
  getCurrentTripDay,
  getNextUpcomingService,
  msUntilService,
  formatCountdown,
} from "@/utils/activeTrip";

export default function ActiveTripScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const resolvedId = typeof tripId === "string" ? tripId : undefined;
  const { trip, services, loading, error, loadData, clearError } =
    useActiveTripData(resolvedId);
  const [countdown, setCountdown] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!resolvedId) {
      router.replace("/(tabs)");
      return;
    }
  }, [resolvedId, router]);

  const dayInfo = trip ? getCurrentTripDay(trip.startDate, trip.endDate) : null;
  const currentDayIndex = dayInfo?.dayIndex ?? 0;
  const nextService = getNextUpcomingService(services, currentDayIndex);

  useEffect(() => {
    const tick = () => {
      const ms = nextService ? msUntilService(nextService.validFrom) : 0;
      setCountdown(ms > 0 ? formatCountdown(ms) : "In progress");
    };
    tick();
    intervalRef.current = setInterval(tick, COUNTDOWN_UPDATE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [nextService]);

  const todayServices = services.filter((s) => s.dayIndex === currentDayIndex);
  const countdownLabel = nextService ? (countdown === "In progress" ? "In progress" : `in ${countdown}`) : "";

  if (!resolvedId) return null;
  if (loading && !trip)
    return <LoadingSpinner message="Loading active trip..." />;
  if (error && !trip) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ErrorToast message={error} onDismiss={clearError} />
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!trip) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Active Trip</Text>
        <Text style={styles.destination}>{trip.destination}</Text>
        {dayInfo ? (
          <View style={styles.dayBadge}>
            <Text style={styles.dayText}>
              Day {dayInfo.dayIndex + 1} of {dayInfo.totalDays}
            </Text>
          </View>
        ) : null}
        <NextServiceBanner
          service={nextService}
          countdownLabel={countdownLabel}
        />
        <Text style={styles.sectionTitle}>Today&apos;s services</Text>
        {todayServices.length === 0 ? (
          <Text style={styles.subtext}>No services scheduled for today.</Text>
        ) : (
          todayServices.map((s) => (
            <ActiveServiceRow
              key={s.id ?? s.serviceId ?? s.providerName}
              item={s}
            />
          ))
        )}
        <View style={styles.spacer} />
      </ScrollView>
      <TouchableOpacity
        style={styles.qrFab}
        onPress={() =>
          router.push({ pathname: "/qr-pass", params: { tripId: resolvedId } })
        }
      >
        <Text style={styles.qrFabText}>🎫 Show QR Pass</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { justifyContent: "center", alignItems: "center", padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  backButton: { marginTop: 60, marginBottom: 8 },
  backText: { fontSize: theme.fonts.medium, color: theme.colors.primary },
  title: {
    fontSize: theme.fonts.title,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 4,
  },
  destination: {
    fontSize: theme.fonts.large,
    color: theme.colors.subtext,
    marginBottom: 12,
  },
  dayBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  dayText: {
    fontSize: theme.fonts.regular,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  sectionTitle: {
    fontSize: theme.fonts.medium,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 12,
  },
  subtext: {
    fontSize: theme.fonts.regular,
    color: theme.colors.subtext,
    marginBottom: 12,
  },
  spacer: { height: 24 },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.radius.md,
    marginTop: 16,
  },
  retryBtnText: {
    color: theme.colors.background,
    fontWeight: "bold",
    fontSize: theme.fonts.medium,
  },
  backLink: { color: theme.colors.subtext, marginTop: 12 },
  qrFab: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: "center",
  },
  qrFabText: {
    color: theme.colors.text,
    fontWeight: "bold",
    fontSize: theme.fonts.medium,
  },
});
