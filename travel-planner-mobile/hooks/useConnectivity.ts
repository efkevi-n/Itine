import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import type { ConnectivityStatus } from '@/types/offline';

function netStateToStatus(state: NetInfoState | null): ConnectivityStatus {
  if (!state || state.isConnected == null) return 'unknown';
  return state.isConnected ? 'online' : 'offline';
}

export function useConnectivity(): { isOnline: boolean; status: ConnectivityStatus } {
  const [status, setStatus] = useState<ConnectivityStatus>('unknown');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus(netStateToStatus(state));
    });
    NetInfo.fetch().then((state) => setStatus(netStateToStatus(state)));
    return () => unsubscribe();
  }, []);

  return { isOnline: status === 'online', status };
}
