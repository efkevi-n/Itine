import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import type { ConnectivityStatus } from '@/types/offline';

function netStateToStatus(state: NetInfoState | null): ConnectivityStatus {
  if (!state || state.isConnected == null) return 'unknown';
  return state.isConnected ? 'online' : 'offline';
}

export function getConnectivityStatus(): Promise<ConnectivityStatus> {
  return NetInfo.fetch().then((state) => netStateToStatus(state));
}

export function isOnline(): Promise<boolean> {
  return getConnectivityStatus().then((s) => s === 'online');
}
