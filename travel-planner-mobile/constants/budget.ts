/**
 * Budget category display config: colors and labels for chart and table.
 * Matches spec: Flights blue, Accommodation green, Transport purple, Activities amber, Food red.
 */

import type { BudgetCategoryKey } from '@/types/budget';

export const BUDGET_CATEGORY_FLIGHTS = '#38bdf8';
export const BUDGET_CATEGORY_ACCOMMODATION = '#22c55e';
export const BUDGET_CATEGORY_TRANSPORT = '#a78bfa';
export const BUDGET_CATEGORY_ACTIVITIES = '#f59e0b';
export const BUDGET_CATEGORY_FOOD = '#f87171';

export const BUDGET_CATEGORIES: Record<
  BudgetCategoryKey,
  { label: string; icon: string; color: string }
> = {
  flights: { label: 'Flights', icon: '✈️', color: BUDGET_CATEGORY_FLIGHTS },
  accommodation: {
    label: 'Accommodation',
    icon: '🏨',
    color: BUDGET_CATEGORY_ACCOMMODATION,
  },
  transport: { label: 'Transport', icon: '🚕', color: BUDGET_CATEGORY_TRANSPORT },
  activities: {
    label: 'Activities',
    icon: '🎭',
    color: BUDGET_CATEGORY_ACTIVITIES,
  },
  food: { label: 'Food', icon: '🍽️', color: BUDGET_CATEGORY_FOOD },
};
