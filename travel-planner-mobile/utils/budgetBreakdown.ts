import type { BudgetBreakdownView, BudgetCategory, BudgetCategoryKey } from '@/types/budget';
import { BUDGET_CATEGORIES } from '@/constants/budget';
import type { BudgetBreakdownItem } from '@/api/itinerary';

const CATEGORY_KEYS: BudgetCategoryKey[] = [
  'flights',
  'accommodation',
  'transport',
  'activities',
  'food',
];

function parseAmount(item: BudgetBreakdownItem): number {
  const v = item.amount ?? item.value;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

function normalizeCategoryKey(raw: string): BudgetCategoryKey {
  const lower = raw.toLowerCase();
  if (lower.includes('flight')) return 'flights';
  if (lower.includes('accommodation') || lower.includes('hotel')) return 'accommodation';
  if (lower.includes('transport') || lower.includes('transfer')) return 'transport';
  if (lower.includes('activit')) return 'activities';
  if (lower.includes('food') || lower.includes('meal')) return 'food';
  return 'activities';
}

/**
 * Maps API cost breakdown + trip total budget/currency to BudgetBreakdownView.
 * Fills all 5 categories; missing API categories get 0 allocated.
 */
export function mapCostBreakdownToView(
  breakdown: BudgetBreakdownItem[] | undefined,
  totalBudget: number,
  currency: string
): BudgetBreakdownView {
  const amounts: Partial<Record<BudgetCategoryKey, number>> = {};
  CATEGORY_KEYS.forEach((key) => {
    amounts[key] = 0;
  });
  if (Array.isArray(breakdown)) {
    breakdown.forEach((item) => {
      const key = normalizeCategoryKey(
        String(item.category ?? item.type ?? item.label ?? '')
      );
      const amt = parseAmount(item);
      amounts[key] = (amounts[key] ?? 0) + amt;
    });
  }
  const categories: BudgetCategory[] = CATEGORY_KEYS.map((key) => ({
    key,
    label: BUDGET_CATEGORIES[key].label,
    icon: BUDGET_CATEGORIES[key].icon,
    color: BUDGET_CATEGORIES[key].color,
    allocated: amounts[key] ?? 0,
  }));
  const totalAllocated = categories.reduce((s, c) => s + c.allocated, 0);
  return {
    categories,
    totalBudget,
    totalAllocated,
    currency,
  };
}
