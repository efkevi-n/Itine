export const BIOMETRIC_PROMPT = 'Verify your identity to show Trip Pass';

export const AUTO_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const BIOMETRIC_CANCEL_LABEL = 'Cancel';

export const BIOMETRIC_STRINGS = {
  LOCK_TITLE: 'Your Trip Pass is locked',
  UNLOCK_BIOMETRIC: 'Unlock with Face ID / Fingerprint',
  UNLOCK_PIN: 'Unlock with PIN',
  AUTH_FAILED: 'Authentication failed. Try again.',
} as const;
