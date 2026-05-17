import { create } from 'zustand';
import type { ToastType } from '@/components/Toast';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
  show: (message: string, type: ToastType, duration?: number) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: '',
  type: 'info',
  visible: false,
  show: (message, type, duration) => {
    set({ message, type, visible: true });
    setTimeout(() => {
      set({ visible: false });
    }, duration || 3000);
  },
  hide: () => set({ visible: false }),
}));

export const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
  useToastStore.getState().show(message, type, duration);
};

export const showSuccessToast = (message: string, duration?: number) => {
  showToast(message, 'success', duration);
};

export const showErrorToast = (message: string, duration?: number) => {
  showToast(message, 'error', duration);
};

export const showInfoToast = (message: string, duration?: number) => {
  showToast(message, 'info', duration);
};
