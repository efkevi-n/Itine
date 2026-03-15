import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/api/client';
import { MAX_QUEUE_SIZE } from '@/constants/offline';
import type { QueuedRequest } from '@/types/offline';

const QUEUE_KEY = 'offline_request_queue';

const SENSITIVE_FIELDS = [
  'password', 'passwd', 'pwd', 'secret', 'token', 'accessToken', 'refreshToken',
  'authorization', 'apiKey', 'apikey', 'creditCard', 'cardNumber', 'cvv', 'cvc',
  'payment', 'stripe', 'billing', 'ssn', 'pin', 'otp',
];
const SENSITIVE_PATH_SEGMENTS = ['auth', 'login', 'register', 'password', 'payment', 'pay', 'token', 'stripe', 'billing'];
const ALLOWED_METHODS = ['patch', 'post'];

function isSensitivePath(url: string): boolean {
  const path = url.replace(/^https?:\/\/[^/]+/, '').toLowerCase();
  return SENSITIVE_PATH_SEGMENTS.some((seg) => path.includes(`/${seg}`) || path.includes(`/${seg}/`));
}

function containsSensitiveData(obj: unknown, depth = 0): boolean {
  if (depth > 10) return true;
  if (obj == null || typeof obj !== 'object') return false;
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = String(key).toLowerCase();
    if (SENSITIVE_FIELDS.some((f) => keyLower.includes(f))) return true;
    if (typeof value === 'object' && value !== null && containsSensitiveData(value, depth + 1)) return true;
  }
  return false;
}

function isSafeToQueue(url: string, method: string, body: unknown): boolean {
  const methodLower = method.toLowerCase();
  if (!ALLOWED_METHODS.includes(methodLower)) return false;
  if (isSensitivePath(url)) return false;
  if (body != null && containsSensitiveData(body)) return false;
  return true;
}

async function readQueue(): Promise<QueuedRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(list: QueuedRequest[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list));
}

export async function queueRequest(url: string, method: string, body: unknown): Promise<void> {
  if (!isSafeToQueue(url, method, body)) return;
  const list = await readQueue();
  if (list.length >= MAX_QUEUE_SIZE) return;
  const id = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  list.push({ id, url, method, body, queuedAt: new Date().toISOString() });
  await writeQueue(list);
}

export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  return readQueue();
}

export async function retryQueuedRequests(): Promise<void> {
  const list = await readQueue();
  if (list.length === 0) return;
  const remaining: QueuedRequest[] = [];
  for (const req of list) {
    try {
      await api.request({
        url: req.url.startsWith('http') ? req.url : req.url,
        method: req.method as 'get' | 'post' | 'patch' | 'put' | 'delete',
        data: req.body,
      });
    } catch {
      remaining.push(req);
    }
  }
  await writeQueue(remaining);
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
