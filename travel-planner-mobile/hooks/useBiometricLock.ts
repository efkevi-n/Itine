import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { LockState } from '@/types/biometric';
import { authenticate } from '@/utils/biometricAuth';
import { AUTO_LOCK_TIMEOUT_MS } from '@/constants/biometric';
import type { AuthResult } from '@/types/biometric';

export function useBiometricLock(): {
  lockState: LockState;
  unlock: () => Promise<AuthResult>;
  lock: () => void;
  isLocked: boolean;
  resetLockTimer: () => void;
} {
  const [lockState, setLockState] = useState<LockState>('locked');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lock = useCallback(() => {
    clearTimer();
    setLockState('locked');
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setLockState('locked');
    }, AUTO_LOCK_TIMEOUT_MS);
  }, [clearTimer]);

  const resetLockTimer = useCallback(() => {
    if (lockState === 'unlocked') startTimer();
  }, [lockState, startTimer]);

  const unlock = useCallback(async (): Promise<AuthResult> => {
    setLockState('authenticating');
    const result = await authenticate();
    if (result.success) {
      setLockState('unlocked');
      startTimer();
    } else {
      setLockState('locked');
    }
    return result;
  }, [startTimer]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background') lock();
    });
    return () => sub.remove();
  }, [lock]);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    lockState,
    unlock,
    lock,
    isLocked: lockState === 'locked',
    resetLockTimer,
  };
}
