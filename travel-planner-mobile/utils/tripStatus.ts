import { STATUS_COLORS } from '@/types/trip';

export function getStatusColor(status: string): string {
  const key = status.toUpperCase();
  return STATUS_COLORS[key] ?? '#94a3b8';
}

export function isQrPassAvailable(status: string): boolean {
  const s = status.toUpperCase();
  return s === 'CONFIRMED' || s === 'ACTIVE';
}
