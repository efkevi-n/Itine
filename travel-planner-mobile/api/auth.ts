import { api } from './client';

/** Request body for POST /auth/register */
export interface RegisterDto {
  email?: string;
  password?: string;
  name?: string;
}

/** Request body for POST /auth/login */
export interface LoginDto {
  email?: string;
  password?: string;
}

/** Response shape for login/register (typical JWT response) */
export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
}

export const authApi = {
  register: (data: RegisterDto) =>
    api.post<AuthTokens>('/auth/register', data),

  login: (data: LoginDto) =>
    api.post<AuthTokens>('/auth/login', data),

  logout: () =>
    api.post('/auth/logout'),

  refresh: () =>
    api.post<AuthTokens>('/auth/refresh'),
};
