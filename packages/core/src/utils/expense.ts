import { EXPENSE_CATEGORIES } from '../constants'

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export function normalizeExpenseCategory(value: string | null): ExpenseCategory {
  const normalized = value?.trim().toLowerCase()

  return normalized && (EXPENSE_CATEGORIES as ReadonlyArray<string>).includes(normalized)
    ? (normalized as ExpenseCategory)
    : 'other'
}

export function resolveExpenseTitle(title: string | null, description: string): string {
  return title?.trim() || description.trim() || 'Expense'
}
