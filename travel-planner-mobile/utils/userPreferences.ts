import AsyncStorage from '@react-native-async-storage/async-storage';

export const USER_PREFERENCES_KEY = 'user_preferences';

export type DefaultCurrency = 'USD' | 'EUR' | 'GBP' | 'TRY';

export interface UserPreferences {
  defaultCurrency: DefaultCurrency;
  tripReminders: boolean;
  biometricLogin: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultCurrency: 'USD',
  tripReminders: true,
  biometricLogin: false,
};

function parsePreferences(raw: string | null): UserPreferences {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  try {
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      defaultCurrency:
        parsed.defaultCurrency === 'USD' ||
        parsed.defaultCurrency === 'EUR' ||
        parsed.defaultCurrency === 'GBP' ||
        parsed.defaultCurrency === 'TRY'
          ? parsed.defaultCurrency
          : DEFAULT_PREFERENCES.defaultCurrency,
      tripReminders:
        typeof parsed.tripReminders === 'boolean'
          ? parsed.tripReminders
          : DEFAULT_PREFERENCES.tripReminders,
      biometricLogin:
        typeof parsed.biometricLogin === 'boolean'
          ? parsed.biometricLogin
          : DEFAULT_PREFERENCES.biometricLogin,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function loadUserPreferences(): Promise<UserPreferences> {
  const raw = await AsyncStorage.getItem(USER_PREFERENCES_KEY);
  return parsePreferences(raw);
}

export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  await AsyncStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(prefs));
}
