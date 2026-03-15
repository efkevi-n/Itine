import { useState, useEffect } from 'react';
import type { Toast, ToastType } from '@/types/loading';
import { DEFAULT_TOAST_DURATION_MS } from '@/constants/toast';

let toasts: Toast[] = [];
type Listener = (t: Toast[]) => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function showToast(type: ToastType, message: string, duration = DEFAULT_TOAST_DURATION_MS): void {
  const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  toasts = [...toasts, { id, type, message, duration }];
  notify();
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function useToastStore(): Toast[] {
  const [state, setState] = useState<Toast[]>(toasts);
  useEffect(() => {
    const listener: Listener = (t) => setState(t);
    listeners.add(listener);
    setState([...toasts]);
    return () => { listeners.delete(listener); };
  }, []);
  return state;
}
