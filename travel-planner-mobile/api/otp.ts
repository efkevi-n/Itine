import { api } from './client';

/** Request body for POST /otp/verify */
export interface VerifyOtpDto {
  jti?: string;
  otp?: string;
  [key: string]: unknown;
}

/** OTP response from GET /trippass/:jti/otp */
export interface OtpResponse {
  otp?: string;
  [key: string]: unknown;
}

export const otpApi = {
  getOtp: (jti: string) =>
    api.get<OtpResponse>(`/trippass/${jti}/otp`),

  verify: (data: VerifyOtpDto) =>
    api.post('/otp/verify', data),
};
