import React, { useState, useRef, useEffect } from 'react';
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
import { authApi } from '@/api/auth';
import { saveTokens } from '@/utils/auth';
import { getPendingDeepLink, clearPendingDeepLink, handleDeepLink } from '@/utils/deepLinkHandler';
import { getErrorMessage } from '@/utils/errorHandler';

const BG = '#F8F8F6';
const TEXT = '#1F2937';
const GREEN = '#10B981';
const GREY = '#6B7280';

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 3,
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
      const data = response.data;
      const accessToken = data?.accessToken ?? (data as { accessToken?: string })?.accessToken;
      const refreshToken = data?.refreshToken ?? (data as { refreshToken?: string })?.refreshToken;
      if (accessToken && refreshToken) await saveTokens(accessToken, refreshToken);
      const pendingUrl = getPendingDeepLink();
      if (pendingUrl) {
        clearPendingDeepLink();
        await handleDeepLink(pendingUrl, router);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: unknown) {
      if (mounted.current) setError(getErrorMessage(err));
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: 24 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/register'))}
          activeOpacity={0.85}
        >
          <Feather name="chevron-left" size={18} color={TEXT} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log in to manage your AI travel plans.</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.formCard, CARD_SHADOW]}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputRow}>
            <Feather name="mail" size={16} color="rgba(107,114,128,0.6)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>Password</Text>
          <View style={styles.inputRow}>
            <Feather name="lock" size={16} color="rgba(107,114,128,0.6)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color="rgba(107,114,128,0.6)" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotBtn} onPress={() => Alert.alert('Forgot password', 'Password reset is coming soon.')} activeOpacity={0.7}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.75 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.92}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity
            style={[styles.socialBtn, CARD_SHADOW]}
            activeOpacity={0.88}
            onPress={() => Alert.alert('Google Sign In', 'Coming soon.')}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.socialBtnText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.socialBtn, CARD_SHADOW]}
            activeOpacity={0.88}
            onPress={() => Alert.alert('Apple Sign In', 'Coming soon.')}
          >
            <Feather name="smartphone" size={18} color={TEXT} />
            <Text style={styles.socialBtnText}>Apple</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerMuted}>Don&apos;t have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/register')} hitSlop={{ top: 8, bottom: 8 }}>
            <Text style={styles.footerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 8,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: GREY,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#EF4444', textAlign: 'center', fontSize: 14 },
  formCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  inputLabelSpaced: { marginTop: 20 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 248, 246, 0.8)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    paddingVertical: 0,
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 12, marginBottom: 8 },
  forgotText: { fontSize: 13, fontWeight: '500', color: GREY },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: '500',
    color: GREY,
  },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
  },
  googleIcon: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
  socialBtnText: { fontSize: 14, fontWeight: '500', color: TEXT },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerMuted: { fontSize: 14, color: GREY },
  footerLink: { fontSize: 14, fontWeight: '600', color: GREEN },
});
