import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_ACCESS = 'accessToken';
const KEY_REFRESH = 'refreshToken';

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_REFRESH);
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await AsyncStorage.multiSet([
    [KEY_ACCESS, accessToken],
    [KEY_REFRESH, refreshToken],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_ACCESS, KEY_REFRESH]);
}
