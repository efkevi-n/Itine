export const ERROR_MESSAGES = {
  NETWORK: 'Check your connection and try again',
  SERVER: 'Something went wrong, please try again',
  INVALID_CREDENTIALS: 'Email or password is incorrect',
  BUDGET_TOO_LOW: 'Your budget is too low for this destination',
  NO_FLIGHTS: 'No flights found, try different dates',
  UNAUTHORIZED: 'Please log in to continue',
  NOT_FOUND: 'This item no longer exists',
  UNKNOWN: 'An unexpected error occurred',
} as const;

export const SUCCESS_MESSAGES = {
  TRIP_CONFIRMED: 'Trip confirmed! 🎉',
  PROFILE_UPDATED: 'Profile updated successfully',
  LOGGED_OUT: 'Logged out successfully',
  TRIP_CREATED: 'Trip created! Generating itinerary...',
} as const;
