import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Travel Planner API client.
 * Base URL: https://backend-mobile-production-4d32.up.railway.app
 * Docs: https://backend-mobile-production-4d32.up.railway.app/api/docs
 */
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'https://backend-mobile-production-4d32.up.railway.app';
const normalizedBase = baseURL.startsWith('http') ? baseURL : `https://${baseURL}`;

export const api = axios.create({
  baseURL: normalizedBase,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

