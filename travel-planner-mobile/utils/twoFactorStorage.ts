import AsyncStorage from '@react-native-async-storage/async-storage';

const TWO_FACTOR_KEY = '@itine/two_factor_enabled';
const TWO_FACTOR_PHONE_KEY = '@itine/two_factor_phone';

export async function getTwoFactorEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(TWO_FACTOR_KEY);
  return value === 'true';
}

export async function setTwoFactorEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(TWO_FACTOR_KEY, enabled ? 'true' : 'false');
}

export async function getTwoFactorPhone(): Promise<string | null> {
  return AsyncStorage.getItem(TWO_FACTOR_PHONE_KEY);
}

export async function setTwoFactorPhone(phone: string): Promise<void> {
  await AsyncStorage.setItem(TWO_FACTOR_PHONE_KEY, phone);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `••• ••• ${digits.slice(-4)}`;
}
