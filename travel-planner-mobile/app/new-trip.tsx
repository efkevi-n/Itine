import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { api } from "@/api/client";
import { DestinationSearch } from "@/components/DestinationSearch";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useConnectivity } from "@/hooks/useConnectivity";
import { OFFLINE_MESSAGES } from "@/constants/offline";
import { LOADER_MESSAGES_ITINERARY } from "@/constants/loader";
import { getErrorMessage } from "@/utils/errorHandler";

const BG = "#F8F8F6";
const TEXT = "#1F2937";
const GREEN = "#10B981";
const GREY = "#6B7280";
const LIGHT_GRAY = "#F3F4F6";

const currencies = ["USD", "EUR", "GBP", "TRY"] as const;

const currencyLabels: Record<string, string> = {
  USD: "USD ($)",
  EUR: "EUR (€)",
  GBP: "GBP (£)",
  TRY: "TRY (₺)",
};

const preferences = [
  {
    id: "budget_hotel",
    label: "Budget Hotel",
    apiValue: "budget hotel",
    group: "accommodation" as const,
  },
  {
    id: "hostel",
    label: "Hostel",
    apiValue: "hostel",
    group: "accommodation" as const,
  },
  {
    id: "private_room",
    label: "Airbnb",
    apiValue: "private room",
    group: "accommodation" as const,
  },
  {
    id: "window_seat",
    label: "Public Transit",
    apiValue: "window seat",
    group: "transport" as const,
  },
  {
    id: "aisle_seat",
    label: "Night Bus",
    apiValue: "aisle seat",
    group: "transport" as const,
  },
  {
    id: "nonstop_flights",
    label: "Walkable",
    apiValue: "non-stop flights only",
    group: "transport" as const,
  },
  {
    id: "vegetarian",
    label: "Vegetarian",
    apiValue: "vegetarian meals",
    group: "transport" as const,
  },
];

const STEPS = [
  { key: "dest", label: "Dest" },
  { key: "origin", label: "Origin" },
  { key: "dates", label: "Dates" },
  { key: "budget", label: "Budget" },
  { key: "prefs", label: "Prefs" },
];

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
};

function parseDate(str: string): Date | null {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function isValidDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateYYYYMMDD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateDisplay(isoString: string): string {
  const d = parseDate(isoString);
  if (!d) return "";
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function validate(
  destination: string,
  origin: string,
  startDate: string,
  endDate: string,
  budget: string,
): string | null {
  if (!destination.trim()) return "Destination is required.";
  if (!origin.trim()) return "Origin city is required.";
  if (!startDate.trim()) return "Start date is required.";
  if (!endDate.trim()) return "End date is required.";
  if (!isValidDateString(startDate))
    return "Start date must be in YYYY-MM-DD format.";
  if (!isValidDateString(endDate))
    return "End date must be in YYYY-MM-DD format.";
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return "Please enter valid dates.";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) return "Start date must be in the future.";
  if (end <= start) return "End date must be after start date.";
  const budgetNum = parseFloat(budget);
  if (isNaN(budgetNum) || budgetNum <= 0)
    return "Budget must be greater than 0.";
  return null;
}

function getCurrentStepIndex(
  destination: string,
  origin: string,
  startDate: string,
  endDate: string,
  budget: string,
): number {
  if (!destination.trim()) return 0;
  if (!origin.trim()) return 1;
  if (!startDate.trim() || !endDate.trim()) return 2;
  if (!budget.trim()) return 3;
  return 4;
}

function StepRail({ currentStep }: { currentStep: number }) {
  return (
    <View style={styles.stepRail}>
      {STEPS.map((step, index) => {
        const isComplete = index < currentStep;
        const isActive = index === currentStep;
        const isUpcoming = index > currentStep;
        const dotStyle = isUpcoming
          ? styles.stepDotUpcoming
          : isActive || isComplete
          ? styles.stepDotActive
          : styles.stepDotUpcoming;
        const labelStyle = isUpcoming
          ? styles.stepLabelUpcoming
          : styles.stepLabelActive;

        return (
          <React.Fragment key={step.key}>
            {index > 0 ? (
              <View
                style={[
                  styles.stepConnector,
                  index <= currentStep
                    ? styles.stepConnectorActive
                    : styles.stepConnectorIdle,
                ]}
              />
            ) : null}
            <View
              style={[styles.stepItem, isUpcoming && styles.stepItemUpcoming]}
            >
              <View style={dotStyle}>
                <Text
                  style={[
                    styles.stepDotText,
                    isUpcoming && styles.stepDotTextUpcoming,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <Text style={labelStyle}>{step.label}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

function SectionCard({
  stepNum,
  title,
  icon,
  children,
}: {
  stepNum: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.sectionCard, CARD_SHADOW]}>
      <View style={styles.sectionCardHeader}>
        <View style={styles.sectionIconWrap}>
          <Feather name={icon} size={10} color={GREEN} />
        </View>
        <Text style={styles.sectionCardTitle}>
          {stepNum} {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export default function NewTripScreen() {
  const router = useRouter();
  const { insets, top, stackScrollBottom } = useScreenInsets();
  const { isOnline } = useConnectivity();
  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pickerField, setPickerField] = useState<
    "startDate" | "endDate" | null
  >(null);
  const [pickerValue, setPickerValue] = useState<Date>(new Date());
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState<(typeof currencies)[number]>("USD");
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const currentStep = useMemo(
    () => getCurrentStepIndex(destination, origin, startDate, endDate, budget),
    [destination, origin, startDate, endDate, budget],
  );

  const accommodationPrefs = useMemo(
    () => preferences.filter((p) => p.group === "accommodation"),
    [],
  );
  const transportPrefs = useMemo(
    () => preferences.filter((p) => p.group === "transport"),
    [],
  );

  const togglePref = (id: string) => {
    if (loading) return;
    setSelectedPrefs((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleGenerate = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError("");
    if (!isOnline) {
      setError(OFFLINE_MESSAGES.cannotCreateTrip);
      return;
    }
    const validationError = validate(
      destination,
      origin,
      startDate,
      endDate,
      budget,
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const preferencesObj = preferences.reduce<Record<string, boolean>>(
        (acc, pref) => {
          acc[pref.id] = selectedPrefs.includes(pref.id);
          return acc;
        },
        {},
      );

      const createRes = await api.post<{ id?: string; data?: { id?: string } }>(
        "/trips",
        {
          destination: destination.trim(),
          origin: origin.trim(),
          startDate: startDate.trim(),
          endDate: endDate.trim(),
          budget: Number(budget),
          currency: currency,
          preferences: preferencesObj,
        },
      );

      const tripId =
        createRes.data?.id ??
        (createRes.data as { data?: { id?: string } })?.data?.id;
      if (!tripId) {
        setError("Server did not return a trip ID.");
        setLoading(false);
        return;
      }

      const genRes = await api.post<{ jobId?: string; id?: string }>(
        "/itinerary/generate",
        {
          tripId,
        },
      );
      const jobId = genRes.data?.jobId ?? genRes.data?.id;
      if (!jobId) {
        setError("Server did not return a job ID.");
        setLoading(false);
        return;
      }

      const pollInterval = 3000;
      const maxAttempts = 20;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, pollInterval));
        const jobRes = await api.get<{ status?: string }>(
          `/itinerary/jobs/${jobId}`,
        );
        const status = (jobRes.data?.status ?? "").toLowerCase();
        if (status === "complete" || status === "completed") {
          setLoading(false);
          router.replace({ pathname: "/itinerary-review", params: { tripId } });
          return;
        }
        if (status === "failed" || status === "error") {
          const msg =
            (jobRes.data as { message?: string })?.message ??
            "Itinerary generation failed.";
          setError(msg);
          setLoading(false);
          return;
        }
      }

      setError(
        'Generation is taking longer than expected. Please check "Your Trips" later.',
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown; status?: number } };
      console.log("TRIP ERROR:", JSON.stringify(e?.response?.data, null, 2));
      console.log("STATUS:", e?.response?.status);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !isOnline;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openDatePicker = (field: "startDate" | "endDate") => {
    if (disabled) return;
    setError("");
    const current =
      field === "startDate"
        ? parseDate(startDate) ?? today
        : parseDate(endDate) ?? parseDate(startDate) ?? today;
    setPickerValue(current);
    setPickerField(field);
  };

  const commitPickedDate = (field: "startDate" | "endDate", d: Date) => {
    const next = formatDateYYYYMMDD(d);
    if (field === "startDate") {
      setStartDate(next);
      const end = parseDate(endDate);
      if (end && end <= d) setEndDate("");
      return;
    }
    setEndDate(next);
  };

  const minimumForField = (field: "startDate" | "endDate"): Date => {
    if (field === "startDate") return today;
    const start = parseDate(startDate);
    if (!start) return today;
    const min = new Date(start);
    min.setDate(min.getDate() + 1);
    return min;
  };

  const renderPrefChip = (pref: (typeof preferences)[number]) => {
    const selected = selectedPrefs.includes(pref.id);
    return (
      <TouchableOpacity
        key={pref.id}
        style={[styles.prefChip, selected && styles.prefChipActive]}
        onPress={() => togglePref(pref.id)}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <Text
          style={[styles.prefChipText, selected && styles.prefChipTextActive]}
        >
          {pref.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              disabled={disabled}
              activeOpacity={0.85}
            >
              <Feather name="arrow-left" size={18} color={TEXT} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Plan New Trip</Text>
          </View>
          <StepRail currentStep={currentStep} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: stackScrollBottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.main}>
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {!isOnline ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>
                    {OFFLINE_MESSAGES.cannotCreateTrip}
                  </Text>
                </View>
              ) : null}

              <SectionCard stepNum="01" title="Destination" icon="map-pin">
                <DestinationSearch
                  placeholder="Where do you want to go?"
                  value={destination}
                  onSelect={(city, country) =>
                    setDestination(`${city}, ${country}`)
                  }
                  editable={!disabled}
                  variant="light"
                />
              </SectionCard>

              <SectionCard stepNum="02" title="Origin" icon="navigation">
                <DestinationSearch
                  placeholder="Where are you flying from?"
                  value={origin}
                  onSelect={(city, country) =>
                    setOrigin(`${city}, ${country}`)
                  }
                  editable={!disabled}
                  variant="light"
                />
              </SectionCard>

              <SectionCard stepNum="03" title="Dates" icon="calendar">
                <View style={styles.datesRow}>
                  <View style={styles.dateCol}>
                    <Text style={styles.dateLabel}>Departure</Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      disabled={disabled}
                      onPress={async () => {
                        await Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light,
                        );
                        openDatePicker("startDate");
                      }}
                      style={styles.dateInput}
                      accessibilityRole="button"
                      accessibilityLabel="Pick departure date"
                    >
                      <Feather
                        name="calendar"
                        size={14}
                        color={`${GREY}80`}
                        style={styles.dateIcon}
                      />
                      <Text
                        style={[
                          styles.dateText,
                          !startDate && styles.datePlaceholder,
                        ]}
                      >
                        {startDate ? formatDateDisplay(startDate) : "Select"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dateCol}>
                    <Text style={styles.dateLabel}>Return</Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      disabled={disabled}
                      onPress={async () => {
                        await Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light,
                        );
                        openDatePicker("endDate");
                      }}
                      style={styles.dateInput}
                      accessibilityRole="button"
                      accessibilityLabel="Pick return date"
                    >
                      <Feather
                        name="calendar"
                        size={14}
                        color={`${GREY}80`}
                        style={styles.dateIcon}
                      />
                      <Text
                        style={[
                          styles.dateText,
                          !endDate && styles.datePlaceholder,
                        ]}
                      >
                        {endDate ? formatDateDisplay(endDate) : "Select"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </SectionCard>

              <SectionCard stepNum="04" title="Budget" icon="credit-card">
                  <Text style={styles.budgetHint}>
                    Total budget for the entire trip (including flights & stay)
                  </Text>
                  <View style={styles.budgetRow}>
                    <TouchableOpacity
                      style={styles.currencySelect}
                      onPress={() => !disabled && setCurrencyPickerOpen(true)}
                      disabled={disabled}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.currencySelectText}>
                        {currencyLabels[currency]}
                      </Text>
                      <Feather name="chevron-down" size={12} color={GREY} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.budgetInput}
                      placeholder="e.g. 1500"
                      placeholderTextColor="#9CA3AF"
                      value={budget}
                      onChangeText={setBudget}
                      keyboardType="numeric"
                      editable={!disabled}
                    />
                  </View>
                </SectionCard>

                <SectionCard stepNum="05" title="Preferences" icon="sliders">
                  <View style={styles.prefGroup}>
                    <Text style={styles.prefGroupLabel}>Accommodation</Text>
                    <View style={styles.prefRow}>
                      {accommodationPrefs.map(renderPrefChip)}
                    </View>
                  </View>
                  <View style={styles.prefGroup}>
                    <Text style={styles.prefGroupLabel}>Transport</Text>
                    <View style={styles.prefRow}>
                      {transportPrefs.map(renderPrefChip)}
                    </View>
                  </View>
                </SectionCard>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={[styles.stickyCta, { bottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.generateBtn, disabled && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={disabled}
            activeOpacity={0.92}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="zap" size={16} color="#fff" />
            )}
            <Text style={styles.generateBtnText}>
              {loading ? "Generating..." : "Generate My Trip"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FullScreenLoader
        visible={loading}
        messages={LOADER_MESSAGES_ITINERARY}
      />

      <Modal
        visible={pickerField !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerField(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setPickerField(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.pickerCard}
            onPress={() => {}}
          >
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {pickerField === "startDate"
                  ? "Select departure"
                  : "Select return"}
              </Text>
              <TouchableOpacity onPress={() => setPickerField(null)}>
                <Feather name="x" size={18} color={GREY} />
              </TouchableOpacity>
            </View>
            {pickerField ? (
              <>
                <Text style={styles.pickerPreview}>
                  {formatDateDisplay(formatDateYYYYMMDD(pickerValue))}
                </Text>
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={pickerValue}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={minimumForField(pickerField)}
                    themeVariant="light"
                    textColor={TEXT}
                    accentColor={GREEN}
                    style={styles.dateTimePicker}
                    onChange={(_: DateTimePickerEvent, d?: Date) => {
                      if (!d) return;
                      setPickerValue(d);
                    }}
                  />
                </View>
              </>
            ) : null}
            <View style={styles.pickerActions}>
              <TouchableOpacity
                style={styles.pickerBtnGhost}
                onPress={() => setPickerField(null)}
              >
                <Text style={styles.pickerBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pickerBtnPrimary}
                onPress={() => {
                  if (!pickerField) return;
                  commitPickedDate(pickerField, pickerValue);
                  setPickerField(null);
                }}
              >
                <Text style={styles.pickerBtnPrimaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={currencyPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyPickerOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setCurrencyPickerOpen(false)}
        >
          <View style={styles.currencyModal}>
            {currencies.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.currencyOption,
                  currency === c && styles.currencyOptionActive,
                ]}
                onPress={() => {
                  setCurrency(c);
                  setCurrencyPickerOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.currencyOptionText,
                    currency === c && styles.currencyOptionTextActive,
                  ]}
                >
                  {currencyLabels[c]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...CARD_SHADOW,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(243, 244, 246, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.3,
  },
  stepRail: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  stepItem: { alignItems: "center", minWidth: 48, gap: 4 },
  stepItemUpcoming: { opacity: 0.5 },
  stepDotActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotUpcoming: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: LIGHT_GRAY,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  stepDotTextUpcoming: { color: GREY },
  stepLabelActive: {
    fontSize: 9,
    fontWeight: "600",
    color: GREEN,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepLabelUpcoming: {
    fontSize: 9,
    fontWeight: "600",
    color: GREY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepConnector: { width: 32, height: 2, borderRadius: 1, marginTop: 11 },
  stepConnectorActive: { backgroundColor: "rgba(16, 185, 129, 0.2)" },
  stepConnectorIdle: { backgroundColor: LIGHT_GRAY },
  main: { paddingHorizontal: 24, paddingTop: 24, gap: 24, flexGrow: 1 },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 16,
    padding: 12,
  },
  errorText: { color: "#EF4444", textAlign: "center", fontSize: 14 },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 0,
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCardTitle: { fontSize: 14, fontWeight: "700", color: TEXT },
  datesRow: { flexDirection: "row", gap: 12 },
  dateCol: { flex: 1 },
  dateLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: GREY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(243, 244, 246, 0.5)",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 14,
    paddingRight: 14,
  },
  dateIcon: { marginLeft: 14, marginRight: 8 },
  dateText: { flex: 1, fontSize: 14, color: "#1F2937", fontWeight: "600" },
  datePlaceholder: { color: "#9CA3AF", fontWeight: "400" },
  pickerPreview: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  pickerWrap: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  dateTimePicker: {
    alignSelf: "center",
    width: "100%",
    backgroundColor: "#fff",
  },
  budgetHint: { fontSize: 12, color: GREY, marginBottom: 12, lineHeight: 18 },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(243, 244, 246, 0.5)",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 16,
    overflow: "hidden",
  },
  currencySelect: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  currencySelectText: { fontSize: 14, fontWeight: "600", color: TEXT },
  budgetInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  prefGroup: { marginBottom: 16 },
  prefGroupLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: GREY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  prefRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prefChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  prefChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  prefChipText: { fontSize: 13, fontWeight: "500", color: TEXT },
  prefChipTextActive: { color: "#fff", fontWeight: "600" },
  stickyCta: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 40,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 24,
    justifyContent: "center",
  },
  pickerCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pickerTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  pickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  pickerBtnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pickerBtnGhostText: { color: GREY, fontWeight: "600" },
  pickerBtnPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: GREEN,
  },
  pickerBtnPrimaryText: { color: "#fff", fontWeight: "700" },
  currencyModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 8,
    marginTop: "auto",
    marginBottom: "auto",
  },
  currencyOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  currencyOptionActive: { backgroundColor: "rgba(16, 185, 129, 0.1)" },
  currencyOptionText: { fontSize: 16, color: TEXT, fontWeight: "500" },
  currencyOptionTextActive: { color: GREEN, fontWeight: "700" },
});
