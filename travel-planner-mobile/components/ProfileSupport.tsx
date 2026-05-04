import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

const HELP_URL = 'https://backend-mobile-production-4d32.up.railway.app/api/docs';
const APP_VERSION_LABEL = 'AI Travel Planner v1.0.0';

const PRIVACY_PLACEHOLDER =
  'This privacy policy is a placeholder. It will describe how AI Travel Planner collects, uses, and protects your data when the legal copy is finalized.';

export function ProfileSupport() {
  const [privacyVisible, setPrivacyVisible] = useState(false);

  const openHelp = useCallback(() => {
    Linking.openURL(HELP_URL).catch(() => {});
  }, []);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionEyebrow}>Help</Text>
      <Text style={styles.sectionTitle}>Support</Text>
      <View style={styles.sectionDivider} />

      <TouchableOpacity style={styles.linkRow} onPress={openHelp} activeOpacity={0.75}>
        <View style={styles.linkLeft}>
          <Feather name="help-circle" size={18} color={theme.colors.primary} />
          <Text style={styles.linkTitle}>Help & FAQ</Text>
        </View>
        <Feather name="chevron-right" size={18} color={theme.colors.subtext} />
      </TouchableOpacity>

      <View style={styles.rowDivider} />

      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => setPrivacyVisible(true)}
        activeOpacity={0.75}
      >
        <View style={styles.linkLeft}>
          <Feather name="shield" size={18} color={theme.colors.primary} />
          <Text style={styles.linkTitle}>Privacy policy</Text>
        </View>
        <Feather name="chevron-right" size={18} color={theme.colors.subtext} />
      </TouchableOpacity>

      <View style={styles.rowDivider} />

      <View style={styles.versionRow}>
        <Text style={styles.versionLabel}>App version</Text>
        <Text style={styles.versionValue}>{APP_VERSION_LABEL}</Text>
      </View>

      <Modal
        visible={privacyVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setPrivacyVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPrivacyVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Privacy policy</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalBody}>{PRIVACY_PLACEHOLDER}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setPrivacyVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    marginBottom: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  versionRow: {
    paddingTop: 14,
    paddingBottom: 4,
  },
  versionLabel: {
    fontSize: 10,
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  versionValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  modalScroll: {
    maxHeight: 280,
  },
  modalBody: {
    color: theme.colors.subtext,
    fontSize: 14,
    lineHeight: 22,
  },
  modalClose: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
});
