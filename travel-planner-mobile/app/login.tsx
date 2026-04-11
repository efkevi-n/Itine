import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '@/api/auth';
import { saveTokens } from '@/utils/auth';
import {
  getPendingDeepLink,
  clearPendingDeepLink,
  handleDeepLink,
} from '@/utils/deepLinkHandler';
import { getErrorMessage } from '@/utils/errorHandler';
import { theme } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
      const data = response.data;
      const accessToken = data?.accessToken ?? (data as { accessToken?: string })?.accessToken;
      const refreshToken = data?.refreshToken ?? (data as { refreshToken?: string })?.refreshToken;
      if (accessToken && refreshToken) {
        await saveTokens(accessToken, refreshToken);
      }

      const pendingUrl = getPendingDeepLink();
      if (pendingUrl) {
        clearPendingDeepLink();
        await handleDeepLink(pendingUrl, router);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>✈️ Travel Planner</Text>
        <Text style={styles.subtitle}>Welcome back!</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.link}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: theme.colors.primary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: theme.colors.subtext, textAlign: 'center', marginBottom: 32 },
  error: { backgroundColor: 'rgba(127,29,29,0.5)', color: theme.colors.error, padding: 12, borderRadius: theme.radius.sm, marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: theme.colors.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 16 },
  link: { color: theme.colors.primary, textAlign: 'center', fontSize: 14 },
});