import axios, { type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '@/utils/auth';

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

let isRefreshing = false;
type QueueCallback = (token: string | null) => void;
let pendingQueue: QueueCallback[] = [];

function drainQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error?.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Don't attempt refresh for the refresh endpoint itself
    if (original.url?.includes('/auth/refresh')) {
      await clearTokens();
      unauthorizedHandler?.();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (token) {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          } else {
            reject(error);
          }
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');

      const res = await axios.post<{ accessToken?: string; refreshToken?: string }>(
        `${normalizedBase}/auth/refresh`,
        { refreshToken },
        { headers: { Authorization: `Bearer ${refreshToken}` }, timeout: DEFAULT_TIMEOUT },
      );

      const newAccess = res.data.accessToken;
      if (!newAccess) throw new Error('Refresh response missing accessToken');

      await saveTokens(newAccess, res.data.refreshToken ?? refreshToken);
      drainQueue(newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch {
      drainQueue(null);
      await clearTokens();
      unauthorizedHandler?.();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);
