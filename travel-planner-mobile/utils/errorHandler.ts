import type { ApiError } from '@/types/loading';
import { ERROR_MESSAGES } from '@/constants/errors';

const AXIOS_ERR = 'AxiosError';

export function parseApiError(error: unknown): ApiError {
  if (error && typeof error === 'object' && (error as { name?: string }).name === AXIOS_ERR) {
    const ax = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
    const statusCode = ax.response?.status ?? 0;
    const code = statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 404 ? 'NOT_FOUND' : 'API_ERROR';
    return {
      code,
      message: getErrorMessage(error),
      statusCode,
    };
  }
  return {
    code: 'UNKNOWN',
    message: ERROR_MESSAGES.UNKNOWN,
    statusCode: 0,
  };
}

export function getErrorMessage(error: unknown): string {
  if (error == null) return ERROR_MESSAGES.UNKNOWN;
  const ax = error as { code?: string; response?: { status?: number; data?: { message?: unknown } }; message?: string };
  const status = ax.response?.status;
  const msgRaw = ax.response?.data?.message;
  const apiMsg = typeof msgRaw === 'string'
    ? msgRaw
    : Array.isArray(msgRaw)
      ? String((msgRaw as unknown[])[0] ?? '')
      : typeof msgRaw === 'object' && msgRaw !== null
        ? String(((msgRaw as Record<string, unknown>).message as unknown[] | undefined)?.[0] ?? (msgRaw as Record<string, unknown>).error ?? '')
        : '';
  const lower = apiMsg.toLowerCase();

  if (ax.code === 'ECONNABORTED' || (typeof ax.message === 'string' && ax.message.toLowerCase().includes('timeout'))) {
    return ERROR_MESSAGES.TIMEOUT;
  }
  if (status === 0 || ax.message === 'Network Error' || (typeof ax.message === 'string' && ax.message.toLowerCase().includes('network'))) {
    return ERROR_MESSAGES.NETWORK;
  }
  if (status === 401) {
    if (lower.includes('credential') || lower.includes('invalid') || lower.includes('incorrect') || lower.includes('password')) {
      return ERROR_MESSAGES.INVALID_CREDENTIALS;
    }
    return ERROR_MESSAGES.UNAUTHORIZED;
  }
  if (status === 404) return ERROR_MESSAGES.NOT_FOUND;
  if (status === 400 && (lower.includes('budget') || lower.includes('low'))) return ERROR_MESSAGES.BUDGET_TOO_LOW;
  if (status === 400 && (lower.includes('flight') || lower.includes('no flight'))) return ERROR_MESSAGES.NO_FLIGHTS;
  if (status === 400 && (lower.includes('credential') || lower.includes('invalid') || lower.includes('incorrect'))) {
    return ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  if (status && status >= 500) return ERROR_MESSAGES.SERVER;
  if (apiMsg.trim()) return apiMsg.trim();
  if (typeof ax.message === 'string' && ax.message.trim()) return ax.message.trim();
  return ERROR_MESSAGES.UNKNOWN;
}
