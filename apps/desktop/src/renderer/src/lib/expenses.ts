import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ExpenseItemOutput, UpdateExpenseInput } from '@tars/core/schemas/expenses'
import type { DeleteRecordInput, DeleteRecordOutput } from '@tars/core/schemas/records'

import { orpc } from './orpc'

const CATEGORY_HASH_SEED = 2166136261
const CATEGORY_HASH_PRIME = 16777619

function hashCategory(category: string): number {
  let hash = CATEGORY_HASH_SEED

  for (let index = 0; index < category.length; index += 1) {
    hash ^= category.charCodeAt(index)
    hash = Math.imul(hash, CATEGORY_HASH_PRIME)
  }

  return hash >>> 0
}

export function categoryColor(category: string): string {
  const hash = hashCategory(category)
  const hue = hash % 360
  const lightness = 64 + (hash % 7)

  return `hsl(${hue} 86% ${lightness}%)`
}

const expensesKey = orpc.expenses.list.queryKey()

export function useExpenses() {
  return useQuery(orpc.expenses.list.queryOptions())
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateExpenseInput) => orpc.expenses.update.call(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: expensesKey })
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: DeleteRecordInput): Promise<DeleteRecordOutput> =>
      orpc.expenses.delete.call(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: expensesKey })
  })
}

export function expenseAt(item: ExpenseItemOutput): string {
  return item.occurredAt
}

export function sumExpenses(items: Array<ExpenseItemOutput>): number {
  return items.reduce((total, item) => total + item.amountCents, 0)
}

export type ExpenseCategory = {
  label: string
  amountCents: number
  count: number
}

export function summarizeCategories(items: Array<ExpenseItemOutput>): Array<ExpenseCategory> {
  const totals = new Map<string, { amountCents: number; count: number }>()

  for (const item of items) {
    const current = totals.get(item.category) ?? { amountCents: 0, count: 0 }

    current.amountCents += item.amountCents
    current.count += 1
    totals.set(item.category, current)
  }

  return [...totals.entries()]
    .map(([label, value]) => ({ label, ...value }))
    .sort((left, right) => right.amountCents - left.amountCents)
}
