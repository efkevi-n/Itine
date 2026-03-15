export const DEEP_LINK_SCHEME = 'travplanner';

export const DEEP_LINK_ROUTES = {
  TRIP: 'travplanner://trip/:tripId',
  TRIP_PASS: 'travplanner://trippass/:jti',
  ITINERARY: 'travplanner://itinerary/:tripId',
} as const;

export const SHARE_FOOTER = '✈️ Powered by AI Travel Planner';
