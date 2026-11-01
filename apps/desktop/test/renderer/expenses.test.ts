import { describe, expect, it } from 'vitest'

import type { ExpenseItemOutput } from '@tars/core/schemas/expenses'

import {
  categoryColor,
  sumExpenses,
  summarizeCategories
} from '../../src/renderer/src/lib/expenses'

function expense(overrides: Partial<ExpenseItemOutput> = {}): ExpenseItemOutput {
  return {
    id: 'expense-1',
    title: 'Coffee',
    description: '',
    amountCents: 450,
    currency: 'USD',
    category: 'food',
    occurredAt: '2026-11-01T10:00:00.000Z',
    ...overrides
  }
}

describe('sumExpenses', () => {
  it('returns zero for an empty list', () => {
    expect(sumExpenses([])).toBe(0)
  })

  it('adds every amount in cents', () => {
    expect(
      sumExpenses([
        expense({ amountCents: 450 }),
        expense({ id: 'e2', amountCents: 1200 }),
        expense({ id: 'e3', amountCents: 5 })
      ])
    ).toBe(1655)
  })
})

describe('summarizeCategories', () => {
  it('groups by category and sorts by spend', () => {
    const summary = summarizeCategories([
      expense({ category: 'food', amountCents: 450 }),
      expense({ id: 'e2', category: 'bills', amountCents: 9000 }),
      expense({ id: 'e3', category: 'food', amountCents: 550 }),
      expense({ id: 'e4', category: 'transport', amountCents: 200 })
    ])

    expect(summary).toEqual([
      { label: 'bills', amountCents: 9000, count: 1 },
      { label: 'food', amountCents: 1000, count: 2 },
      { label: 'transport', amountCents: 200, count: 1 }
    ])
  })

  it('returns an empty summary when there are no expenses', () => {
    expect(summarizeCategories([])).toEqual([])
  })
})

describe('categoryColor', () => {
  it('is stable per category and emits an hsl color', () => {
    const color = categoryColor('food')

    expect(categoryColor('food')).toBe(color)
    expect(color).toMatch(/^hsl\(\d{1,3} 86% \d{2}%\)$/)
  })

  it('separates different categories', () => {
    expect(categoryColor('food')).not.toBe(categoryColor('bills'))
  })
})
