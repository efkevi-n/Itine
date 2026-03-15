/**
 * Types for local trip reminder notifications.
 */

/** Minimal trip data needed to schedule reminders */
export interface TripForReminder {
  tripId: string;
  destination: string;
  startDate: string;
}
