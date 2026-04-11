import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { api } from '@/api/client';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const passwordStrength = useMemo(() => {
    const len = password.length;
    if (len < 6) return 'weak' as const;
    if (len < 10) return 'good' as const;
    return 'strong' as const;
  }, [password.length]);

  const handleRegister = async () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        phonenumber: phone || undefined,
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

  const strengthLabel =
    passwordStrength === 'weak' ? 'Weak' : passwordStrength === 'good' ? 'Good' : 'Strong';
  const strengthLabelColor =
    passwordStrength === 'weak'
      ? 'rgba(239,68,68,0.9)'
      : passwordStrength === 'good'
        ? '#f59e0b'
        : '#22c55e';

  return (
    <View style={styles.screen}>
      <View style={[styles.glowOrb, styles.glowOrbTop]} pointerEvents="none" />
      <View style={[styles.glowOrb, styles.glowOrbBottom]} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.formBlock, { opacity: fadeAnim }]}>
            <View style={styles.logoWrap} accessibilityRole="image" accessibilityLabel="TravelAI">
              <Svg width={26} height={26} viewBox="0 0 24 24">
                <Path
                  fill="#ffffff"
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                />
              </Svg>
            </View>

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join TravelAI and start planning</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#4b5563"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#4b5563"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#4b5563"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <View style={styles.strengthRow}>
                <View style={styles.barsWrap}>
                  <View
                    style={[
                      styles.strengthBar,
                      passwordStrength === 'weak'
                        ? styles.strengthBarWeak
                        : passwordStrength === 'good'
                          ? styles.strengthBarGood
                          : styles.strengthBarStrong,
                    ]}
                  />
                  <View
                    style={[
                      styles.strengthBar,
                      passwordStrength === 'weak'
                        ? styles.strengthBarInactive
                        : passwordStrength === 'good'
                          ? styles.strengthBarGood
                          : styles.strengthBarStrong,
                    ]}
                  />
                  <View
                    style={[
                      styles.strengthBar,
                      passwordStrength === 'strong' ? styles.strengthBarStrong : styles.strengthBarInactive,
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strengthLabelColor }]}>{strengthLabel}</Text>
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.phoneLabelRow}>
                <Text style={styles.phoneFieldLabel}>Phone Number</Text>
                <View style={styles.optionalPill}>
                  <Text style={styles.optionalPillText}>Optional</Text>
                </View>
              </View>
              <TextInput
                style={styles.input}
                placeholder="+1 555 000 0000"
                placeholderTextColor="#4b5563"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerDivider} />

            <View style={styles.footerRow}>
              <Text style={styles.footerMuted}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')} hitSlop={{ top: 8, bottom: 8 }}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  flex: {
    flex: 1,
  },
  glowOrb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  glowOrbTop: {
    top: -80,
    right: -100,
  },
  glowOrbBottom: {
    bottom: -120,
    left: -80,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  formBlock: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 28,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4b5563',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  phoneLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  phoneFieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4b5563',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  optionalPill: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  optionalPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6366f1',
  },
  input: {
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    height: 52,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
    height: 52,
  },
  eyeBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  barsWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthBarInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  strengthBarWeak: {
    backgroundColor: 'rgba(239,68,68,0.8)',
  },
  strengthBarGood: {
    backgroundColor: '#f59e0b',
  },
  strengthBarStrong: {
    backgroundColor: '#22c55e',
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 42,
    textAlign: 'right',
  },
  primaryBtn: {
    width: '100%',
    height: 54,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.85,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 28,
    marginBottom: 20,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerMuted: {
    color: '#9ca3af',
    fontSize: 15,
  },
  footerLink: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '600',
  },
});
