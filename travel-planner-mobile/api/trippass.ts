import { api } from './client';

/** Request body for POST /trippass/:jti/revoke */
export interface RevokeTripPassDto {
  reason?: string;
  [key: string]: unknown;
}

/** Trip pass response from GET /trippass/:jti */
export interface TripPass {
  jti?: string;
  tripId?: number;
  [key: string]: unknown;
}

/** OTP response from GET /trippass/:jti/otp */
export interface TripPassOtp {
  otp?: string;
  [key: string]: unknown;
}

/** Status response from GET /trippass/:jti/status */
export interface TripPassStatus {
  status?: string;
  [key: string]: unknown;
}

export type TripId = string | number;

function toId(id: TripId): string {
  return String(id);
}

export const trippassApi = {
  generate: (tripId: TripId) =>
    api.post<TripPass>(`/trippass/generate/${toId(tripId)}`),

  getTripPass: (jti: string) =>
    api.get<TripPass>(`/trippass/${jti}`),

  getOtp: (jti: string) =>
    api.get<TripPassOtp>(`/trippass/${jti}/otp`),

  revoke: (jti: string, data: RevokeTripPassDto) =>
    api.post(`/trippass/${jti}/revoke`, data),

  getStatus: (jti: string) =>
    api.get<TripPassStatus>(`/trippass/${jti}/status`),
};
