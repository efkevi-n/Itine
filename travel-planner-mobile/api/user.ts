import { api } from './client';

/** Request body for PATCH /profile and PATCH /users/profile */
export interface UpdateProfileDto {
  name?: string;
  email?: string;
  [key: string]: unknown;
}

/** Profile response from GET /profile or GET /users/profile */
export interface UserProfile {
  id?: number;
  email?: string;
  name?: string;
  photoUrl?: string;
  [key: string]: unknown;
}

export const userApi = {
  getProfile: () =>
    api.get<UserProfile>('/users/profile'),

  updateProfile: (data: UpdateProfileDto) =>
    api.patch<UserProfile>('/users/profile', data),

  uploadPhoto: (formData: FormData) =>
    api.post<{ url?: string }>('/users/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteAccount: () =>
    api.delete('/users/account'),
};
