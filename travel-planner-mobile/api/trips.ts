import { api } from './client';

/** Request body for POST /trips */
export interface CreateTripDto {
  destination?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  currency?: string;
  [key: string]: unknown;
}

/** Request body for PATCH /trips/:id */
export interface UpdateTripDto {
  destination?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  currency?: string;
  status?: string;
  [key: string]: unknown;
}

/** Trip entity from API */
export interface Trip {
  id?: number;
  destination?: string;
  startDate?: string;
  endDate?: string;
  start_date?: string;
  end_date?: string;
  totalBudget?: number;
  total_budget?: number;
  currency?: string;
  status?: string;
  [key: string]: unknown;
}

/** Pagination params for GET /trips */
export interface PaginationParams {
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

/** Trip ID from route params is string; API expects number. Accept both. */
export type TripId = string | number;

function toId(id: TripId): string {
  return String(id);
}

export const tripsApi = {
  create: (data: CreateTripDto) =>
    api.post<Trip>('/trips', data),

  getAll: (params?: PaginationParams) =>
    api.get<Trip[]>('/trips', { params }),

  getById: (id: TripId) =>
    api.get<Trip>(`/trips/${toId(id)}`),

  getStatus: (id: TripId) =>
    api.get<{ status?: string }>(`/trips/${toId(id)}/status`),

  update: (id: TripId, data: UpdateTripDto) =>
    api.patch<Trip>(`/trips/${toId(id)}`, data),

  delete: (id: TripId) =>
    api.delete(`/trips/${toId(id)}`),

  confirm: (id: TripId) =>
    api.post(`/trips/${toId(id)}/confirm`),
};
