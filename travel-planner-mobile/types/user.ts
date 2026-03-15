/**
 * User profile types for Profile screen and API mapping.
 */

/** Profile data for display (from GET /users/profile or normalized) */
export interface ProfileView {
  name: string;
  email: string;
  phone: string;
  photoUrl: string | null;
}

/** Payload for PATCH /users/profile */
export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
}
