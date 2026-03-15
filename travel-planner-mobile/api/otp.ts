import { api } from './client';

/** Request body for POST /otp/verify */
export interface VerifyOtpDto {
  jti?: string;
  otp?: string;
  [key: string]: unknown;
}

/** OTP response from GET /otp/:jti */
export interface OtpResponse {
  otp?: string;
  [key: string]: unknown;
}

export const otpApi = {
  getOtp: (jti: string) =>
    api.get<OtpResponse>(`/otp/${jti}`),

  verify: (data: VerifyOtpDto) =>
    api.post('/otp/verify', data),
};
