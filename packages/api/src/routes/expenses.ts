import type { ExpenseListOutput } from '@tars/core/schemas/expenses'
import type { ExpenseSelect } from '@tars/db/schema'
import { EXPENSE_ITEM_LIMIT } from '@tars/core/constants'
import { expense } from '@tars/db/schema'
import { desc, eq, sql } from '@tars/db/sql'

import { protectedProcedure } from '../context'

type ExpenseRow = Pick<
  ExpenseSelect,
  'id' | 'description' | 'amountCents' | 'currency' | 'category' | 'occurredAt' | 'createdAt'
>

const expenseColumns = {
  id: expense.id,
  description: expense.description,
  amountCents: expense.amountCents,
  currency: expense.currency,
  category: expense.category,
  occurredAt: expense.occurredAt,
  createdAt: expense.createdAt
}

function expenseItem(row: ExpenseRow): ExpenseListOutput['items'][number] {
  return {
    id: row.id,
    description: row.description,
    amountCents: row.amountCents,
    currency: row.currency,
    category: row.category,
    occurredAt: row.occurredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  }
}

export const expensesRouter = {
  list: protectedProcedure.handler(async ({ context }): Promise<ExpenseListOutput> => {
    const rows = await context.db
      .select(expenseColumns)
      .from(expense)
      .where(eq(expense.userId, context.session.user.id))
      .orderBy(desc(sql`coalesce(${expense.occurredAt}, ${expense.createdAt})`))
      .limit(EXPENSE_ITEM_LIMIT)

    return { items: rows.map(expenseItem) }
  })
}
