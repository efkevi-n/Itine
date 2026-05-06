import type {
  BudgetBreakdownView,
  BudgetCategory,
  BudgetCategoryKey,
} from "@/types/budget";
import { BUDGET_CATEGORIES } from "@/constants/budget";
import type { BudgetBreakdownItem } from "@/api/itinerary";

const CATEGORY_KEYS: BudgetCategoryKey[] = [
  "flights",
  "accommodation",
  "transport",
  "activities",
  "food",
];

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    return parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
  }
  return 0;
}

function normalizeCategoryKey(raw: string): BudgetCategoryKey | null {
  const k = raw.toLowerCase().trim();
  if (k === "flight" || k === "flights") return "flights";
  if (k === "accommodation" || k === "hotel" || k === "stay") return "accommodation";
  if (k === "transport" || k === "transfer") return "transport";
  if (k === "activities" || k === "activity") return "activities";
  if (k === "food" || k === "dining" || k === "meals") return "food";
  return null;
}

export function mapCostBreakdownToView(
  items: BudgetBreakdownItem[],
  totalBudget: number,
  currency: string,
): BudgetBreakdownView {
  const amounts: Record<BudgetCategoryKey, number> = {
    flights: 0,
    accommodation: 0,
    transport: 0,
    activities: 0,
    food: 0,
  };

  for (const item of items) {
    const keyRaw = String(item.category ?? item.type ?? item.label ?? "");
    const key = normalizeCategoryKey(keyRaw);
    const amt = num(item.amount ?? item.value);
    if (key) amounts[key] += amt;
  }

  const categories: BudgetCategory[] = CATEGORY_KEYS.map((key) => ({
    key,
    label: BUDGET_CATEGORIES[key].label,
    icon: BUDGET_CATEGORIES[key].icon,
    color: BUDGET_CATEGORIES[key].color,
    allocated: amounts[key],
  }));
  const totalAllocated = categories.reduce((s, c) => s + c.allocated, 0);
  return {
    categories,
    totalBudget,
    totalAllocated,
    currency,
  };
}

/**
 * Normalizes GET /itinerary/:tripId/cost-breakdown body to per-category amounts.
 * Handles:
 * 1) Itinerary: flight, accommodation, transport, activities, food, total
 * 2) Trip budgetAllocation: flightBudget, …, foodBudget, ranges
 * 3) Fallback: flights, accommodation, … (same categories as flat but flights plural)
 */
function amountsFromRawBreakdownObject(
  raw: Record<string, unknown>,
): Record<BudgetCategoryKey, number> {
  // Shape 2: BudgetAllocation (flightBudget, …)
  if (
    "flightBudget" in raw ||
    "accommodationBudget" in raw ||
    "transportBudget" in raw ||
    "activitiesBudget" in raw ||
    "foodBudget" in raw
  ) {
    return {
      flights: num(raw.flightBudget),
      accommodation: num(raw.accommodationBudget),
      transport: num(raw.transportBudget),
      activities: num(raw.activitiesBudget),
      food: num(raw.foodBudget),
    };
  }

  // Shape 1 & 3: flat — itinerary uses "flight", fallback uses "flights"
  return {
    flights: num(raw.flights ?? raw.flight),
    accommodation: num(raw.accommodation),
    transport: num(raw.transport),
    activities: num(raw.activities),
    food: num(raw.food),
  };
}

export function mapFlatCostBreakdownToView(
  raw: Record<string, unknown>,
  totalBudget: number,
  currency: string,
): BudgetBreakdownView {
  const amounts = amountsFromRawBreakdownObject(raw);
  const categories: BudgetCategory[] = CATEGORY_KEYS.map((key) => ({
    key,
    label: BUDGET_CATEGORIES[key].label,
    icon: BUDGET_CATEGORIES[key].icon,
    color: BUDGET_CATEGORIES[key].color,
    allocated: amounts[key],
  }));
  const totalAllocated = categories.reduce((s, c) => s + c.allocated, 0);
  return {
    categories,
    totalBudget,
    totalAllocated,
    currency,
  };
}

export type ParsedCostBreakdown =
  | { ok: true; view: BudgetBreakdownView }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * True if this object is a "flat" cost breakdown (not only error, not array wrapper).
 */
function isFlatCostBreakdownObject(raw: Record<string, unknown>): boolean {
  if (typeof raw.error === "string" && raw.error.trim()) return false;

  const keys = [
    "flight",
    "flights",
    "flightBudget",
    "accommodation",
    "accommodationBudget",
    "transport",
    "transportBudget",
    "activities",
    "activitiesBudget",
    "food",
    "foodBudget",
    "total",
  ];
  return keys.some((k) => k in raw);
}

export function parseCostBreakdownPayload(
  body: unknown,
  totalBudget: number,
  currency: string,
): ParsedCostBreakdown {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid breakdown response." };
  }
  const raw = body;

  if (typeof raw.error === "string" && raw.error.trim()) {
    return { ok: false, error: raw.error.trim() };
  }

  if (Array.isArray(raw.breakdown)) {
    return {
      ok: true,
      view: mapCostBreakdownToView(
        raw.breakdown as BudgetBreakdownItem[],
        totalBudget,
        currency,
      ),
    };
  }

  if (isFlatCostBreakdownObject(raw)) {
    return {
      ok: true,
      view: mapFlatCostBreakdownToView(raw, totalBudget, currency),
    };
  }

  return { ok: false, error: "Unrecognized breakdown format." };
}
