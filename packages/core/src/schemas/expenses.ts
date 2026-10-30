import * as z from 'zod'

import { EXPENSE_CATEGORIES } from '../constants'

export const expenseItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim(),
  amountCents: z.number(),
  currency: z.string().trim().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  occurredAt: z.string().nullable(),
  createdAt: z.string().min(1)
})

export const expenseListSchema = z.object({
  items: z.array(expenseItemSchema)
})

export type ExpenseItemInput = z.input<typeof expenseItemSchema>
export type ExpenseItemOutput = z.output<typeof expenseItemSchema>
export type ExpenseListInput = z.input<typeof expenseListSchema>
export type ExpenseListOutput = z.output<typeof expenseListSchema>
