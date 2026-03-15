import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { tripsApi } from "@/api/trips";
import { bookingsApi } from "@/api/bookings";
import { TripHeader } from "@/components/TripHeader";
import { BookingCard } from "@/components/BookingCard";
import { OfflineBanner } from "@/components/OfflineBanner";
import type { TripDetailView, BookingDetailView } from "@/types/trip";
import { isQrPassAvailable } from "@/utils/tripStatus";
import { theme } from "@/constants/theme";
import {
  mapTripToDetailView,
  mapBookingToDetailView,
} from "@/utils/tripDetailMappers";
import { formatTripDateRange } from "@/utils/dateFormat";
import { useConnectivity } from "@/hooks/useConnectivity";
import { cacheTrip, getCachedTrip } from "@/utils/offlineCache";

export default function TripDetailScreen() {
  const router = useRouter();
  const { isOnline } = useConnectivity();
  const { id, tripId } = useLocalSearchParams<{
    id?: string;
    tripId?: string;
  }>();
  const resolvedId = tripId ?? id;
  const [trip, setTrip] = useState<TripDetailView | null>(null);
  const [bookings, setBookings] = useState<BookingDetailView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!resolvedId) return;
    setError(null);
    setLoading(true);
    try {
      const [tripRes, bookingsRes] = await Promise.all([
        tripsApi.getById(resolvedId),
        bookingsApi.getBookingsForTrip(resolvedId).catch(() => ({ data: [] })),
      ]);
      const tripData = tripRes.data as Record<string, unknown>;
      if (!tripData || typeof tripData !== "object") {
        setError("Trip not found.");
        setLoading(false);
        return;
      }
      setTrip(mapTripToDetailView(tripData));
      const rawList = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      setBookings(
        rawList.map((b) =>
          mapBookingToDetailView(b as Record<string, unknown>),
        ),
      );
      await cacheTrip(resolvedId, { trip: tripData, bookings: rawList });
    } catch {
      if (!isOnline) {
        const cached = await getCachedTrip(resolvedId);
        const data = cached?.data as { trip?: Record<string, unknown>; bookings?: unknown[] } | undefined;
        if (data?.trip) {
          setTrip(mapTripToDetailView(data.trip));
          const rawList = Array.isArray(data.bookings) ? data.bookings : [];
          setBookings(rawList.map((b) => mapBookingToDetailView(b as Record<string, unknown>)));
          setError(null);
        } else setError("Offline. No cached trip.");
      } else setError("Failed to load trip. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [resolvedId, isOnline]);

  useEffect(() => {
    if (!resolvedId) return;
    loadData();
  }, [resolvedId, loadData]);

  const handleShare = useCallback(async () => {
    if (!trip) return;
    const message = [
      `🌍 My trip to ${trip.destination}`,
      `📅 ${formatTripDateRange(trip.startDate, trip.endDate)}`,
      `💰 Budget: ${trip.currency} ${trip.totalBudget.toLocaleString()}`,
      "✈️ Powered by AI Travel Planner",
    ].join("\n");
    try {
      await Share.share({ message });
    } catch {
      // ignore
    }
  }, [trip]);

  if (!resolvedId) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Trip not found.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Loading trip...</Text>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error ?? "Trip not found."}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showQr = isQrPassAvailable(trip.status);
  const isActive = trip.status.toUpperCase() === "ACTIVE";

  return (
    <ScrollView style={styles.container}>
      <OfflineBanner visible={!isOnline} />
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <TripHeader trip={trip} />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.budgetBtn}
          onPress={() =>
            router.push({
              pathname: "/budget-breakdown",
              params: { tripId: resolvedId },
            })
          }
        >
          <Text style={styles.budgetBtnText}>💰 Budget</Text>
        </TouchableOpacity>
        {isActive && (
          <TouchableOpacity
            style={styles.trackLiveBtn}
            onPress={() =>
              router.push({
                pathname: "/active-trip",
                params: { tripId: resolvedId },
              })
            }
          >
            <Text style={styles.trackLiveBtnText}>📍 Track Live</Text>
          </TouchableOpacity>
        )}
        {showQr && (
          <TouchableOpacity
            style={styles.qrBtn}
            onPress={() =>
              router.push({
                pathname: "/qr-pass",
                params: { tripId: resolvedId },
              })
            }
          >
            <Text style={styles.qrBtnText}>🎫 Show QR Pass</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={showQr || isActive ? styles.shareBtn : styles.shareBtnFull}
          onPress={handleShare}
        >
          <Text style={styles.shareBtnText}>📤 Share Trip</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Your Bookings</Text>
      {bookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No bookings yet. Bookings will appear here once confirmed.
          </Text>
        </View>
      ) : (
        bookings.map((b, i) => <BookingCard key={b.id ?? i} booking={b} />)
      )}
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 24 },
  center: { justifyContent: "center", alignItems: "center" },
  backButton: { marginTop: 60, marginBottom: 24 },
  backText: { color: "#38bdf8", fontSize: 16 },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
    flexWrap: "wrap",
  },
  budgetBtn: {
    flex: 1,
    minWidth: 100,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  budgetBtnText: { color: theme.colors.primary, fontWeight: "bold", fontSize: 15 },
  trackLiveBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: theme.colors.success,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  trackLiveBtnText: { color: "#0f172a", fontWeight: "bold", fontSize: 15 },
  qrBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#38bdf8",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  qrBtnText: { color: "#0f172a", fontWeight: "bold", fontSize: 15 },
  shareBtn: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  shareBtnFull: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  shareBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  emptyText: { color: "#94a3b8", textAlign: "center", fontSize: 14 },
  spacer: { height: 40 },
  loadingText: { color: "#94a3b8", marginTop: 12 },
  errorText: { color: "#fca5a5", textAlign: "center", marginBottom: 16 },
  retryBtn: {
    backgroundColor: "#38bdf8",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryBtnText: { color: "#0f172a", fontWeight: "bold", fontSize: 16 },
  backLink: { color: "#94a3b8", fontSize: 14 },
});
