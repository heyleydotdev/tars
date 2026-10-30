import { ORPCError } from '@orpc/client'

import type { ExpenseListOutput } from '@tars/core/schemas/expenses'
import type { ExpenseSelect } from '@tars/db/schema'
import { EXPENSE_ITEM_LIMIT } from '@tars/core/constants'
import { updateExpenseSchema } from '@tars/core/schemas/expenses'
import { deleteRecordSchema } from '@tars/core/schemas/records'
import { normalizeExpenseCategory, resolveExpenseTitle } from '@tars/core/utils/expense'
import { expense } from '@tars/db/schema'
import { and, desc, eq } from '@tars/db/sql'

import { protectedProcedure } from '../context'

type ExpenseRow = Pick<
  ExpenseSelect,
  'id' | 'title' | 'description' | 'amountCents' | 'currency' | 'category' | 'occurredAt'
>

const expenseColumns = {
  id: expense.id,
  title: expense.title,
  description: expense.description,
  amountCents: expense.amountCents,
  currency: expense.currency,
  category: expense.category,
  occurredAt: expense.occurredAt
}

function expenseItem(row: ExpenseRow): ExpenseListOutput['items'][number] {
  return {
    id: row.id,
    title: resolveExpenseTitle(row.title, row.description),
    description: row.description,
    amountCents: row.amountCents,
    currency: row.currency,
    category: normalizeExpenseCategory(row.category),
    occurredAt: row.occurredAt.toISOString()
  }
}

export const expensesRouter = {
  list: protectedProcedure.handler(async ({ context }): Promise<ExpenseListOutput> => {
    const rows = await context.db
      .select(expenseColumns)
      .from(expense)
      .where(eq(expense.userId, context.session.user.id))
      .orderBy(desc(expense.occurredAt))
      .limit(EXPENSE_ITEM_LIMIT)

    return { items: rows.map(expenseItem) }
  }),

  update: protectedProcedure
    .input(updateExpenseSchema)
    .handler(async ({ input, context }): Promise<{ id: string }> => {
      const updated: Array<{ id: string }> = await context.db
        .update(expense)
        .set({
          title: input.title,
          description: input.description,
          amountCents: Math.round(input.amount * 100),
          currency: input.currency,
          category: input.category,
          occurredAt: new Date(input.occurredAt)
        })
        .where(and(eq(expense.id, input.id), eq(expense.userId, context.session.user.id)))
        .returning({ id: expense.id })

      if (updated.length === 0) {
        throw new ORPCError('NOT_FOUND')
      }

      return { id: input.id }
    }),

  delete: protectedProcedure
    .input(deleteRecordSchema)
    .handler(async ({ input, context }): Promise<{ id: string }> => {
      const deleted: Array<{ id: string }> = await context.db
        .delete(expense)
        .where(and(eq(expense.id, input.id), eq(expense.userId, context.session.user.id)))
        .returning({ id: expense.id })

      if (deleted.length === 0) {
        throw new ORPCError('NOT_FOUND')
      }

      return { id: input.id }
    })
}
