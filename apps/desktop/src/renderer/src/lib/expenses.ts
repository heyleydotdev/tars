import { useQuery } from '@tanstack/react-query'

import type { ExpenseItemOutput } from '@tars/core/schemas/expenses'

import { orpc } from './orpc'

const CATEGORY_COLORS = [
  { text: 'text-sky-400', dot: 'bg-sky-400', bar: 'bg-sky-400' },
  { text: 'text-emerald-400', dot: 'bg-emerald-400', bar: 'bg-emerald-400' },
  { text: 'text-amber-300', dot: 'bg-amber-400', bar: 'bg-amber-400' },
  { text: 'text-violet-400', dot: 'bg-violet-400', bar: 'bg-violet-400' },
  { text: 'text-rose-400', dot: 'bg-rose-400', bar: 'bg-rose-400' },
  { text: 'text-teal-400', dot: 'bg-teal-400', bar: 'bg-teal-400' }
] as const

const UNCATEGORIZED_COLOR = {
  text: 'text-muted-foreground',
  dot: 'bg-muted-foreground',
  bar: 'bg-muted-foreground'
}

export function useExpenses() {
  return useQuery(orpc.expenses.list.queryOptions())
}

export function expenseAt(item: ExpenseItemOutput): string {
  return item.occurredAt ?? item.createdAt
}

export function sumExpenses(items: Array<ExpenseItemOutput>): number {
  return items.reduce((total, item) => total + item.amountCents, 0)
}

export function categoryLabel(category: string | null): string {
  return category?.trim() || 'uncategorized'
}

export function categoryColor(category: string | null) {
  const label = categoryLabel(category)

  if (label === 'uncategorized') return UNCATEGORIZED_COLOR

  let hash = 0

  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) | 0
  }

  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length] ?? UNCATEGORIZED_COLOR
}

export type ExpenseCategory = {
  label: string
  amountCents: number
  count: number
}

export function summarizeCategories(items: Array<ExpenseItemOutput>): Array<ExpenseCategory> {
  const totals = new Map<string, { amountCents: number; count: number }>()

  for (const item of items) {
    const label = categoryLabel(item.category)
    const current = totals.get(label) ?? { amountCents: 0, count: 0 }

    current.amountCents += item.amountCents
    current.count += 1
    totals.set(label, current)
  }

  return [...totals.entries()]
    .map(([label, value]) => ({ label, ...value }))
    .sort((left, right) => right.amountCents - left.amountCents)
}
