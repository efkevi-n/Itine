import { api } from './client';

/** Request body for PATCH /bookings/:tripId/:serviceId */
export interface UpdateBookingDto {
  status?: string;
  [key: string]: unknown;
}

/** Booking entity from API */
export interface Booking {
  id?: number;
  tripId?: number;
  serviceId?: number;
  status?: string;
  [key: string]: unknown;
}

export type TripId = string | number;
export type ServiceId = string | number;

function toId(id: TripId | ServiceId): string {
  return String(id);
}

export const bookingsApi = {
  getBookingsForTrip: (tripId: TripId) =>
    api.get<Booking[]>(`/bookings/${toId(tripId)}`),

  getBooking: (tripId: TripId, serviceId: ServiceId) =>
    api.get<Booking>(`/bookings/${toId(tripId)}/${toId(serviceId)}`),

  updateBooking: (tripId: TripId, serviceId: ServiceId, data: UpdateBookingDto) =>
    api.patch<Booking>(`/bookings/${toId(tripId)}/${toId(serviceId)}`, data),

  markAsUsed: (tripId: TripId, serviceId: ServiceId) =>
    api.post(`/bookings/${toId(tripId)}/${toId(serviceId)}/mark-used`),
};
