import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { AuthStepHeader } from '@/components/auth/AuthStepHeader';
import { FloatingInput, PasswordInput } from '@/components/auth/FloatingInput';
import { evaluatePasswordStrength, isValidEmail } from '@/utils/passwordStrength';

const BG = '#F8F8F6';
const TEXT = '#111827';
const GREEN = '#10B981';
const GREY = '#6B7280';

const STEPS = 4;

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const passwordStrength = useMemo(() => evaluatePasswordStrength(password), [password]);
  const emailError =
    emailTouched && email.length > 0 && !isValidEmail(email)
      ? 'Please enter a valid email address.'
      : undefined;
  const confirmError =
    confirmPassword.length > 0 && password !== confirmPassword
      ? 'Passwords do not match.'
      : undefined;

  const handleRegister = async () => {
    setError('');
    if (!passwordStrength.isValid) {
      setError('Please meet all password requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
        phonenumber: phone.trim() || undefined,
      });
      if (response.status >= 200 && response.status < 300) {
        router.replace('/login');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    setError('');
    if (step === 0) {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      setEmailTouched(true);
      if (!isValidEmail(email)) {
        setError('Please enter a valid email address.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    void handleRegister();
  };

  const goBack = () => {
    setError('');
    if (step === 0) {
      if (router.canGoBack()) router.back();
      else router.replace('/onboarding');
      return;
    }
    setStep((s) => s - 1);
  };

  const skipPhone = () => {
    setError('');
    setStep(3);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Text style={styles.title}>What&apos;s your name?</Text>
            <Text style={styles.subtitle}>Let&apos;s start getting to know each other.</Text>
            <FloatingInput
              label="Full Name"
              placeholder="e.g. Jane Doe"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <View style={styles.helperRow}>
              <Feather name="info" size={12} color={GREY} />
              <Text style={styles.helperText}>
                This is how you&apos;ll appear in your travel itinerary and hotel bookings.
              </Text>
            </View>
          </>
        );
      case 1:
        return (
          <>
            <Text style={styles.title}>What&apos;s your email?</Text>
            <Text style={styles.subtitle}>
              We&apos;ll use this to send your booking confirmations and QR passes.
            </Text>
            <FloatingInput
              label="Email Address"
              placeholder="name@example.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailTouched) setEmailTouched(true);
              }}
              onBlur={() => setEmailTouched(true)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={emailError}
            />
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => Alert.alert('Google Sign In', 'Coming soon.')}
                activeOpacity={0.88}
              >
                <Text style={styles.socialIcon}>G</Text>
                <Text style={styles.socialLabel}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => Alert.alert('Apple Sign In', 'Coming soon.')}
                activeOpacity={0.88}
              >
                <Feather name="smartphone" size={18} color={TEXT} />
                <Text style={styles.socialLabel}>Apple</Text>
              </TouchableOpacity>
            </View>
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.title}>What&apos;s your number?</Text>
            <Text style={styles.subtitle}>
              We&apos;ll use this to secure your account and send important travel updates.
            </Text>
            <View style={styles.phoneWrap}>
              <Text style={styles.phoneLabel}>Phone Number</Text>
              <View style={styles.phoneField}>
                <View style={styles.countryCode}>
                  <Text style={styles.flag}>🇺🇸</Text>
                  <Text style={styles.dialCode}>+1</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="(555) 000-0000"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <Text style={styles.consentText}>
              By continuing, you agree to receive SMS messages for account security and travel
              updates. Message and data rates may apply.
            </Text>
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.title}>Secure your account</Text>
            <Text style={styles.subtitle}>
              Create a strong password to protect your ITINE travel passes and bookings.
            </Text>
            <PasswordInput
              label="Password"
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <PasswordInput
              label="Confirm Password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              error={confirmError}
            />
            <View style={styles.strengthCard}>
              <View style={styles.strengthHeader}>
                <Text style={styles.strengthTitle}>Password Strength</Text>
                <Text style={[styles.strengthLabel, { color: passwordStrength.labelColor }]}>
                  {password.length === 0 ? 'Weak' : passwordStrength.label}
                </Text>
              </View>
              <View style={styles.strengthBars}>
                {passwordStrength.barColors.map((color, i) => (
                  <View key={i} style={[styles.strengthBar, { backgroundColor: color }]} />
                ))}
              </View>
              {passwordStrength.requirements.map((req) => (
                <View key={req.key} style={styles.reqRow}>
                  <Feather
                    name={req.met ? 'check-circle' : 'circle'}
                    size={12}
                    color={req.met ? GREEN : GREY}
                  />
                  <Text style={[styles.reqText, req.met && styles.reqTextMet]}>{req.label}</Text>
                </View>
              ))}
            </View>
          </>
        );
      default:
        return null;
    }
  };

  const ctaLabel =
    step === 3 ? 'Create Account' : step === 2 && !phone.trim() ? 'Continue' : 'Continue';

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthStepHeader
        step={step}
        totalSteps={STEPS}
        onBack={goBack}
        onSkip={step === 2 ? skipPhone : undefined}
        showSkip={step === 2}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 24 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>{renderStep()}</View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: 16 + insets.bottom }]}>
        <TouchableOpacity
          style={[
            styles.continueBtn,
            step === 3 && styles.continueBtnFinal,
            loading && { opacity: 0.75 },
          ]}
          onPress={goNext}
          disabled={loading}
          activeOpacity={0.92}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueText}>{ctaLabel}</Text>
          )}
        </TouchableOpacity>

        {step === 0 ? (
          <View style={styles.footer}>
            <Text style={styles.footerMuted}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    justifyContent: 'center',
  },
  form: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: GREY,
    lineHeight: 22,
    marginBottom: 32,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  helperText: { flex: 1, fontSize: 12, color: GREY, lineHeight: 18 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 28,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 12, color: GREY, fontWeight: '500' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  socialIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  socialLabel: { fontSize: 14, fontWeight: '500', color: TEXT },
  phoneWrap: { marginBottom: 8 },
  phoneLabel: {
    position: 'absolute',
    top: -10,
    left: 16,
    zIndex: 2,
    backgroundColor: BG,
    paddingHorizontal: 4,
    fontSize: 11,
    fontWeight: '500',
    color: GREY,
  },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 56,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  flag: { fontSize: 18 },
  dialCode: { fontSize: 14, fontWeight: '500', color: TEXT },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: TEXT,
    paddingHorizontal: 16,
  },
  consentText: {
    fontSize: 12,
    color: GREY,
    lineHeight: 18,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  strengthCard: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthTitle: { fontSize: 12, fontWeight: '600', color: TEXT },
  strengthLabel: { fontSize: 12, fontWeight: '500' },
  strengthBars: { flexDirection: 'row', gap: 6 },
  strengthBar: { flex: 1, height: 6, borderRadius: 3 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqText: { fontSize: 12, color: GREY },
  reqTextMet: { color: TEXT },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  bottom: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 16,
  },
  continueBtn: {
    backgroundColor: GREEN,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  continueBtnFinal: { borderRadius: 20 },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerMuted: { color: GREY, fontSize: 14 },
  footerLink: { color: GREEN, fontSize: 14, fontWeight: '700' },
});
