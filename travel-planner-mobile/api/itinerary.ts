import { api } from './client';

/** Request body for POST /itinerary/generate */
export interface GenerateItineraryDto {
  tripId?: number | string;
  [key: string]: unknown;
}

/** Job status from GET /itinerary/jobs/:jobId */
export interface ItineraryJobStatus {
  jobId?: string;
  status?: string;
  [key: string]: unknown;
}

/** Day / activity shapes from API (flexible) */
export interface ItineraryDayRaw {
  title?: string;
  flight?: Record<string, unknown>;
  hotel?: Record<string, unknown>;
  accommodation?: Record<string, unknown>;
  transport?: Record<string, unknown>;
  activities?: unknown[];
  [key: string]: unknown;
}

/** Itinerary response from GET /itinerary/:tripId */
export interface ItineraryResponse {
  tripId?: number;
  status?: string;
  days?: ItineraryDayRaw[];
  budgetBreakdown?: BudgetBreakdownItem[];
  budget_breakdown?: BudgetBreakdownItem[];
  [key: string]: unknown;
}

export interface BudgetBreakdownItem {
  category?: string;
  type?: string;
  label?: string;
  amount?: number;
  value?: number;
  [key: string]: unknown;
}

/** Flat cost breakdown from GET /itinerary/:tripId/cost-breakdown (happy path). */
export interface CostBreakdownFlat {
  flight?: number;
  accommodation?: number;
  transport?: number;
  activities?: number;
  food?: number;
  /** LLM total cost; may differ from sum of category buckets. */
  total?: number;
}

/** Legacy array shape or error payload stored on failed pipeline. */
export interface CostBreakdownResponse extends CostBreakdownFlat {
  breakdown?: BudgetBreakdownItem[];
  error?: string;
  [key: string]: unknown;
}

export type TripId = string | number;

function toId(id: TripId): string {
  return String(id);
}

export const itineraryApi = {
  generate: (data: GenerateItineraryDto) =>
    api.post<ItineraryJobStatus>('/itinerary/generate', data),

  getJobStatus: (jobId: string) =>
    api.get<ItineraryJobStatus>(`/itinerary/jobs/${jobId}`),

  getItinerary: (tripId: TripId) =>
    api.get<ItineraryResponse>(`/itinerary/${toId(tripId)}`),

  updateItinerary: (tripId: TripId, data?: Record<string, unknown>) =>
    api.patch<ItineraryResponse>(`/itinerary/${toId(tripId)}`, data),

  getCostBreakdown: (tripId: TripId) =>
    api.get<CostBreakdownResponse>(`/itinerary/${toId(tripId)}/cost-breakdown`),
};
