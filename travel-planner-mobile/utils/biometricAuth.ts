import * as LocalAuthentication from 'expo-local-authentication';
import type { BiometricStatus, AuthResult } from '@/types/biometric';
import { BIOMETRIC_PROMPT, BIOMETRIC_CANCEL_LABEL } from '@/constants/biometric';

export async function getBiometricStatus(): Promise<BiometricStatus> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return 'not_available';
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) return 'not_enrolled';
    return 'available';
  } catch {
    return 'not_available';
  }
}

export async function authenticateWithBiometrics(): Promise<AuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: BIOMETRIC_PROMPT,
      cancelLabel: BIOMETRIC_CANCEL_LABEL,
    });
    if (result.success) return { success: true };
    const error = result.error === 'user_cancel' ? undefined : 'Authentication failed';
    return { success: false, error };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Authentication failed';
    return { success: false, error: message };
  }
}

export async function authenticateWithFallback(): Promise<AuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: BIOMETRIC_PROMPT,
      cancelLabel: BIOMETRIC_CANCEL_LABEL,
      fallbackLabel: 'Use Passcode',
    });
    if (result.success) return { success: true };
    const error = result.error === 'user_cancel' ? undefined : 'Authentication failed';
    return { success: false, error };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Authentication failed';
    return { success: false, error: message };
  }
}

export async function authenticate(): Promise<AuthResult> {
  const status = await getBiometricStatus();
  if (status === 'available') return authenticateWithBiometrics();
  return authenticateWithFallback();
}
