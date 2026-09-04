import type { BudgetItem } from '../types/itinerary'

/**
 * How far a generated budgetBreakdown's total may exceed the user's stated
 * budget before it's flagged as unreasonable, as a fraction of the budget
 * (0.2 = 20%). AI-estimated costs naturally vary, but a bigger gap than this
 * usually means the model miscalculated or padded categories, and the user
 * should see a warning rather than silently trust the total.
 */
export const BUDGET_OVERAGE_THRESHOLD = 0.2

export function sumBudgetBreakdown(items: BudgetItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

export function isBudgetOverThreshold(
  budgetBreakdown: BudgetItem[],
  budget: number | undefined,
  threshold: number = BUDGET_OVERAGE_THRESHOLD,
): boolean {
  if (budget == null || budget <= 0 || budgetBreakdown.length === 0) return false
  const total = sumBudgetBreakdown(budgetBreakdown)
  return (total - budget) / budget > threshold
}
