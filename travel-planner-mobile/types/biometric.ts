export type BiometricStatus = 'available' | 'not_available' | 'not_enrolled';

export interface AuthResult {
  success: boolean;
  error?: string;
}

export type LockState = 'locked' | 'unlocked' | 'authenticating';
