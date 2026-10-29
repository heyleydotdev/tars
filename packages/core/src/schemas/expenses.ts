import * as z from 'zod'

export const expenseItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  amountCents: z.number(),
  currency: z.string(),
  category: z.string().nullable(),
  occurredAt: z.string().nullable(),
  createdAt: z.string()
})

export const expenseListSchema = z.object({
  items: z.array(expenseItemSchema)
})

export type ExpenseItemInput = z.input<typeof expenseItemSchema>
export type ExpenseItemOutput = z.output<typeof expenseItemSchema>
export type ExpenseListInput = z.input<typeof expenseListSchema>
export type ExpenseListOutput = z.output<typeof expenseListSchema>
