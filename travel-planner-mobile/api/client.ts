import axios from 'axios';
import { getAccessToken } from '@/utils/auth';
import { clearTokens } from '@/utils/auth';

export const API_BASE_URL = 'https://backend-mobile-production-4d32.up.railway.app';
const DEFAULT_TIMEOUT = 30000;

const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const baseURL = envUrl || API_BASE_URL;
const normalizedBase = (() => {
  const lower = baseURL.toLowerCase();
  if (lower.includes('localhost') || lower.includes('127.0.0.1')) {
    if (__DEV__) {
      console.warn('[api] EXPO_PUBLIC_API_URL points to localhost; using production API instead.');
    }
    return API_BASE_URL;
  }
  return baseURL.startsWith('http') ? baseURL.replace(/\/$/, '') : `https://${baseURL.replace(/\/$/, '')}`;
})();

export const api = axios.create({
  baseURL: normalizedBase,
  timeout: DEFAULT_TIMEOUT,
});

if (__DEV__) {
  console.log('[api] baseURL:', api.defaults.baseURL);
}

/** Turn relative upload paths from the API into absolute URLs for Image. */
export function resolveMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = normalizedBase.replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let React Native set multipart boundary (manual Content-Type breaks uploads).
  if (config.data instanceof FormData) {
    if (config.headers && 'Content-Type' in config.headers) {
      delete config.headers['Content-Type'];
    }
    if (config.headers && 'content-type' in config.headers) {
      delete config.headers['content-type'];
    }
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
