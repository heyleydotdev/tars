import * as z from 'zod'

import { EXPENSE_CATEGORIES } from '../constants'
import { ERRORS } from '../errors'

export const expenseItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim(),
  amountCents: z.number(),
  currency: z.string().trim().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  occurredAt: z.string().min(1)
})

export const expenseListSchema = z.object({
  items: z.array(expenseItemSchema)
})

export const updateExpenseSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, ERRORS.expenseTitleRequired),
  description: z.string().trim(),
  amount: z.number().positive(ERRORS.amountPositive),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, ERRORS.currencyInvalid),
  category: z.enum(EXPENSE_CATEGORIES),
  occurredAt: z.iso.datetime({ offset: true, error: ERRORS.dateInvalid })
})

export type ExpenseItemInput = z.input<typeof expenseItemSchema>
export type ExpenseItemOutput = z.output<typeof expenseItemSchema>
export type ExpenseListInput = z.input<typeof expenseListSchema>
export type ExpenseListOutput = z.output<typeof expenseListSchema>
export type UpdateExpenseInput = z.input<typeof updateExpenseSchema>
export type UpdateExpenseOutput = z.output<typeof updateExpenseSchema>
