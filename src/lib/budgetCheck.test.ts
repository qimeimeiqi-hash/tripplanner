import { describe, expect, it } from 'vitest'
import type { BudgetItem } from '../types/itinerary'
import { BUDGET_OVERAGE_THRESHOLD, isBudgetOverThreshold, sumBudgetBreakdown } from './budgetCheck'

const items = (...amounts: number[]): BudgetItem[] =>
  amounts.map((amount, i) => ({ category: `item-${i}`, amount }))

describe('sumBudgetBreakdown', () => {
  it('sums the amount field across all budget items', () => {
    expect(sumBudgetBreakdown(items(1000, 2000, 500))).toBe(3500)
  })

  it('returns 0 for an empty breakdown', () => {
    expect(sumBudgetBreakdown([])).toBe(0)
  })
})

describe('isBudgetOverThreshold', () => {
  it('returns false when the breakdown total matches the budget exactly', () => {
    expect(isBudgetOverThreshold(items(100000), 100000)).toBe(false)
  })

  it('returns false when the total is under budget', () => {
    expect(isBudgetOverThreshold(items(80000), 100000)).toBe(false)
  })

  it(`returns false when the overage is exactly at the ${BUDGET_OVERAGE_THRESHOLD * 100}% threshold`, () => {
    const budget = 100000
    const total = budget * (1 + BUDGET_OVERAGE_THRESHOLD)
    expect(isBudgetOverThreshold(items(total), budget)).toBe(false)
  })

  it(`returns true when the overage exceeds the ${BUDGET_OVERAGE_THRESHOLD * 100}% threshold`, () => {
    const budget = 100000
    const total = budget * (1 + BUDGET_OVERAGE_THRESHOLD) + 1
    expect(isBudgetOverThreshold(items(total), budget)).toBe(true)
  })

  it('does not flag a total that is far under budget (overage check only fires above budget)', () => {
    expect(isBudgetOverThreshold(items(10000), 100000)).toBe(false)
  })

  it('returns false for a zero budget instead of dividing by zero', () => {
    expect(isBudgetOverThreshold(items(500), 0)).toBe(false)
  })

  it('returns false for a negative budget', () => {
    expect(isBudgetOverThreshold(items(500), -100)).toBe(false)
  })

  it('returns false for an empty breakdown regardless of budget', () => {
    expect(isBudgetOverThreshold([], 100000)).toBe(false)
  })

  it('returns false when the budget is not specified (the traveler left it blank)', () => {
    expect(isBudgetOverThreshold(items(500000), undefined)).toBe(false)
  })

  it('accepts a custom threshold overriding the default', () => {
    const budget = 100000
    expect(isBudgetOverThreshold(items(105000), budget, 0.02)).toBe(true)
    expect(isBudgetOverThreshold(items(105000), budget, 0.1)).toBe(false)
  })
})
