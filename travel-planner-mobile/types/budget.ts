/**
 * Budget breakdown types for Budget Breakdown screen.
 * Category keys align with API and constants/budget.ts.
 */

export type BudgetCategoryKey =
  | 'flights'
  | 'accommodation'
  | 'transport'
  | 'activities'
  | 'food';

/** Single category with display and amount (for chart and table). */
export interface BudgetCategory {
  key: BudgetCategoryKey;
  label: string;
  icon: string;
  color: string;
  allocated: number;
  /** Budget allocated to this category (from trip budget split or API). Optional for "under/over" comparison. */
  budget?: number;
}

/** View model for the Budget Breakdown screen. */
export interface BudgetBreakdownView {
  categories: BudgetCategory[];
  totalBudget: number;
  totalAllocated: number;
  currency: string;
}
