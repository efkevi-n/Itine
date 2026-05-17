import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { userApi } from '@/api/user';
import { mapProfileToView } from '@/utils/profileMappers';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { showToast } from '@/utils/toastStore';
import {
  getTwoFactorEnabled,
  getTwoFactorPhone,
  maskPhone,
  setTwoFactorEnabled,
  setTwoFactorPhone,
} from '@/utils/twoFactorStorage';

const BG = '#F8F8F6';
const TEXT = '#111827';
const GREEN = '#10B981';
const MUTED = '#6B7280';
const BORDER = '#F9FAFB';

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 10,
  elevation: 2,
};

export default function PrivacySecurityScreen() {
  useRequireAuth();
  const router = useRouter();
  const { top, stackScrollBottomCompact: scrollBottom } = useScreenInsets();

  const [loading, setLoading] = useState(true);
  const [twoFactorOn, setTwoFactorOn] = useState(false);
  const [profilePhone, setProfilePhone] = useState('');
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pendingEnable, setPendingEnable] = useState(false);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const [enabled, storedPhone, profileRes] = await Promise.all([
        getTwoFactorEnabled(),
        getTwoFactorPhone(),
        userApi.getProfile(),
      ]);
      const profile = mapProfileToView(profileRes.data as Record<string, unknown>);
      const phone = profile.phone?.trim() ?? '';
      setProfilePhone(phone);
      setTwoFactorOn(enabled);
      setMaskedPhone(storedPhone ? maskPhone(storedPhone) : phone ? maskPhone(phone) : null);
    } catch {
      const enabled = await getTwoFactorEnabled();
      setTwoFactorOn(enabled);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadState();
    }, [loadState]),
  );

  const handleSendCode = async () => {
    if (!profilePhone.trim()) {
      Alert.alert(
        'Phone required',
        'Add a phone number under Personal Information on your profile before enabling 2FA.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to profile', onPress: () => router.replace('/(tabs)/profile') },
        ],
      );
      return;
    }
    setSendingCode(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setVerifyOpen(true);
      setPendingEnable(true);
      showToast('success', `Verification code sent to ${maskPhone(profilePhone)}`);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verifyCode.replace(/\D/g, '').length < 6) {
      showToast('error', 'Enter the 6-digit code');
      return;
    }
    setVerifying(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      await setTwoFactorEnabled(true);
      await setTwoFactorPhone(profilePhone);
      setTwoFactorOn(true);
      setMaskedPhone(maskPhone(profilePhone));
      setVerifyOpen(false);
      setVerifyCode('');
      setPendingEnable(false);
      showToast('success', 'Two-factor verification enabled');
    } finally {
      setVerifying(false);
    }
  };

  const handleToggle = (next: boolean) => {
    if (next) {
      if (twoFactorOn) return;
      setVerifyOpen(false);
      setVerifyCode('');
      handleSendCode();
      return;
    }

    Alert.alert(
      'Turn off 2FA?',
      'Your account will only be protected by your password.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: async () => {
            await setTwoFactorEnabled(false);
            setTwoFactorOn(false);
            setVerifyOpen(false);
            setPendingEnable(false);
            showToast('info', 'Two-factor verification disabled');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top }]}>
        <Text style={styles.pageTitle}>Privacy & Security</Text>
        <Text style={styles.pageSubtitle}>
          Manage how you sign in and protect your travel account.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>Authentication</Text>

        <View style={[styles.card, CARD_SHADOW]}>
          <View style={styles.twoFactorHeader}>
            <View style={styles.iconWrap}>
              <Feather name="smartphone" size={18} color={GREEN} />
            </View>
            <View style={styles.twoFactorCopy}>
              <Text style={styles.cardTitle}>Two-Factor Verification</Text>
              <Text style={styles.cardSubtitle}>
                {twoFactorOn
                  ? 'A code is required when signing in on a new device.'
                  : 'Get a one-time code by SMS when you sign in.'}
              </Text>
            </View>
            {loading ? (
              <ActivityIndicator color={GREEN} />
            ) : (
              <Switch
                value={twoFactorOn}
                onValueChange={handleToggle}
                trackColor={{ false: '#E5E7EB', true: 'rgba(16, 185, 129, 0.35)' }}
                thumbColor={twoFactorOn ? GREEN : '#f4f4f5'}
                ios_backgroundColor="#E5E7EB"
              />
            )}
          </View>

          {twoFactorOn && maskedPhone ? (
            <View style={styles.enabledRow}>
              <Feather name="check-circle" size={14} color={GREEN} />
              <Text style={styles.enabledText}>Enabled · SMS to {maskedPhone}</Text>
            </View>
          ) : null}

          {verifyOpen && pendingEnable ? (
            <View style={styles.verifyBlock}>
              <Text style={styles.verifyLabel}>Enter verification code</Text>
              <TextInput
                style={styles.codeInput}
                value={verifyCode}
                onChangeText={setVerifyCode}
                placeholder="6-digit code"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.primaryBtn, verifying && styles.btnDisabled]}
                onPress={handleVerifyAndEnable}
                disabled={verifying}
                activeOpacity={0.9}
              >
                {verifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify & enable</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setVerifyOpen(false);
                  setPendingEnable(false);
                  setVerifyCode('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelLink}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!twoFactorOn && !verifyOpen && !loading ? (
            <TouchableOpacity
              style={[styles.outlineBtn, sendingCode && styles.btnDisabled]}
              onPress={handleSendCode}
              disabled={sendingCode}
              activeOpacity={0.88}
            >
              {sendingCode ? (
                <ActivityIndicator color={GREEN} />
              ) : (
                <Text style={styles.outlineBtnText}>Set up with SMS</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={[styles.card, CARD_SHADOW]}>
          <InfoRow
            icon="lock"
            title="Password"
            detail="Change your password from the login screen using Forgot password."
          />
          <View style={styles.divider} />
          <InfoRow
            icon="eye-off"
            title="Data usage"
            detail="Trip and profile data are stored securely and used only for your bookings."
          />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  title,
  detail,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={16} color={MUTED} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  pageSubtitle: { fontSize: 14, color: MUTED, lineHeight: 20 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 28,
  },
  twoFactorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoFactorCopy: { flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: MUTED, lineHeight: 18 },
  enabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  enabledText: { fontSize: 13, fontWeight: '600', color: GREEN },
  verifyBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 10,
  },
  verifyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
    color: TEXT,
    paddingVertical: 14,
    paddingHorizontal: 16,
    letterSpacing: 8,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineBtnText: { color: GREEN, fontSize: 14, fontWeight: '700' },
  cancelLink: {
    textAlign: 'center',
    color: MUTED,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 4 },
  infoRow: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 4 },
  infoDetail: { fontSize: 13, color: MUTED, lineHeight: 18 },
});
