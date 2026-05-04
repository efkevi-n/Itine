import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  loadUserPreferences,
  saveUserPreferences,
  type DefaultCurrency,
  type UserPreferences,
} from '@/utils/userPreferences';
import { theme } from '@/constants/theme';

const CURRENCIES: DefaultCurrency[] = ['USD', 'EUR', 'GBP', 'TRY'];

export function ProfilePreferences() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await loadUserPreferences();
      if (!cancelled) {
        setPrefs(p);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: UserPreferences) => {
    setPrefs(next);
    await saveUserPreferences(next);
  }, []);

  const setCurrency = useCallback(
    (defaultCurrency: DefaultCurrency) => {
      if (!prefs) return;
      persist({ ...prefs, defaultCurrency });
    },
    [prefs, persist],
  );

  const setTripReminders = useCallback(
    (tripReminders: boolean) => {
      if (!prefs) return;
      persist({ ...prefs, tripReminders });
    },
    [prefs, persist],
  );

  const setBiometricLogin = useCallback(
    (biometricLogin: boolean) => {
      if (!prefs) return;
      persist({ ...prefs, biometricLogin });
    },
    [prefs, persist],
  );

  if (loading || !prefs) {
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>Settings</Text>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.sectionDivider} />
        <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionEyebrow}>Settings</Text>
      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={styles.sectionDivider} />

      <Text style={styles.fieldLabel}>Default currency</Text>
      <View style={styles.currencyRow}>
        {CURRENCIES.map((code) => {
          const selected = prefs.defaultCurrency === code;
          return (
            <TouchableOpacity
              key={code}
              style={[styles.currencyChip, selected && styles.currencyChipSelected]}
              onPress={() => setCurrency(code)}
              activeOpacity={0.85}
            >
              <Text style={[styles.currencyChipText, selected && styles.currencyChipTextSelected]}>
                {code}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleLabelBlock}>
          <Text style={styles.toggleTitle}>Trip reminders</Text>
          <Text style={styles.toggleSubtitle}>Local notifications for upcoming trips</Text>
        </View>
        <Switch
          value={prefs.tripReminders}
          onValueChange={setTripReminders}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={theme.colors.text}
        />
      </View>

      <View style={styles.rowDivider} />

      <View style={styles.toggleRow}>
        <View style={styles.toggleLabelBlock}>
          <Text style={styles.toggleTitle}>Biometric login</Text>
          <Text style={styles.toggleSubtitle}>Use Face ID or fingerprint when available</Text>
        </View>
        <Switch
          value={prefs.biometricLogin}
          onValueChange={setBiometricLogin}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={theme.colors.text}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionEyebrow: {
    fontSize: 10,
    color: theme.colors.subtext,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginTop: 12,
    marginBottom: 16,
  },
  loader: { paddingVertical: 24 },
  fieldLabel: {
    fontSize: 10,
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 10,
  },
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  currencyChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  currencyChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background,
  },
  currencyChipText: {
    color: theme.colors.subtext,
    fontWeight: '700',
    fontSize: 13,
  },
  currencyChipTextSelected: {
    color: theme.colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLabelBlock: { flex: 1 },
  toggleTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  toggleSubtitle: {
    color: theme.colors.subtext,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 16,
  },
});
