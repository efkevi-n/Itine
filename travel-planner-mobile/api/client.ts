import axios from 'axios';
import { getAccessToken } from '@/utils/auth';
import { clearTokens } from '@/utils/auth';

const BASE_URL = 'https://backend-mobile-production-4d32.up.railway.app';
const DEFAULT_TIMEOUT = 30000;

const baseURL = process.env.EXPO_PUBLIC_API_URL || BASE_URL;
const normalizedBase = baseURL.startsWith('http') ? baseURL : `https://${baseURL}`;

export const api = axios.create({
  baseURL: normalizedBase,
  timeout: DEFAULT_TIMEOUT,
});

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await clearTokens();
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }
    return Promise.reject(error);
  }
);
