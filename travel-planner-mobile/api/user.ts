import { api, resolveMediaUrl } from './client';

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
  avatarUrl?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
}

export interface UploadPhotoResponse {
  avatarUrl?: string;
  photoUrl?: string;
  url?: string;
  user?: UserProfile;
}

type FormDataFile = {
  uri: string;
  type: string;
  name: string;
};

export function extractUploadedPhotoUrl(data: UploadPhotoResponse | undefined): string | null {
  if (!data) return null;
  const user = data.user;
  const raw =
    data.avatarUrl ??
    data.photoUrl ??
    data.url ??
    user?.avatarUrl ??
    user?.photoUrl;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return resolveMediaUrl(raw);
}

export const userApi = {
  getProfile: () =>
    api.get<UserProfile>('/users/profile'),

  updateProfile: (data: UpdateProfileDto) =>
    api.patch<UserProfile>('/users/profile', data),

  uploadPhoto: (uri: string) => {
    const formData = new FormData();
    formData.append('photo', {
      uri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as FormDataFile as unknown as Blob);

    return api.post<UploadPhotoResponse>('/users/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (payload) => payload,
    });
  },

  deleteAccount: () =>
    api.delete('/users/account'),
};
