import { api } from './client';

/** Request body for POST /scanlog */
export interface CreateScanLogDto {
  tripPassJti?: string;
  serviceId?: number;
  scannedAt?: string;
  [key: string]: unknown;
}

/** Scan log entity from API */
export interface ScanLog {
  id?: number;
  tripId?: number;
  tripPassId?: number;
  serviceId?: number;
  scannedAt?: string;
  [key: string]: unknown;
}

export type TripId = string | number;

function toId(id: TripId): string {
  return String(id);
}

export const scanlogApi = {
  create: (data: CreateScanLogDto) =>
    api.post<ScanLog>('/scanlog', data),

  getForTrip: (tripId: TripId) =>
    api.get<ScanLog[]>(`/scanlog/${toId(tripId)}`),
};
