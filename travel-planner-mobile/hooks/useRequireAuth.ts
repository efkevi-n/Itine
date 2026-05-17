import { useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAccessToken } from '@/utils/auth';

/** Redirects to login when the screen is focused and there is no access token. */
export function useRequireAuth(): void {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const token = await getAccessToken();
        if (!token && !cancelled) {
          router.replace('/login');
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [router]),
  );
}
