import { api } from './client';

export interface AdapterSearchParams {
  city?: string;
  origin?: string;
  destination?: string;
  [key: string]: string | number | undefined;
}

/** GET /flights/search — optional query params for route. */
export function searchFlights(params?: AdapterSearchParams) {
  return api.get<unknown[]>('/flights/search', { params: params ?? {} });
}

/** GET /accommodation/search — optional query params (e.g. city). */
export function searchAccommodation(params?: AdapterSearchParams) {
  return api.get<unknown[]>('/accommodation/search', { params: params ?? {} });
}

/** GET /transport/search — optional query params. */
export function searchTransport(params?: AdapterSearchParams) {
  return api.get<unknown[]>('/transport/search', { params: params ?? {} });
}

/** GET /activities/search — optional query params (e.g. city). */
export function searchActivities(params?: AdapterSearchParams) {
  return api.get<unknown[]>('/activities/search', { params: params ?? {} });
}
