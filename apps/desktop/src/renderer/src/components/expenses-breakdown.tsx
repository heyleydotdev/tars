import { formatCurrency } from '@tars/core/utils/format'
import { capitalize } from '@tars/core/utils/string'

import type { ExpenseCategory } from '../lib/expenses'
import { categoryColor } from '../lib/expenses'
import EmptyState from './empty-state'

export default function ExpensesBreakdown({
  categories,
  totalCents,
  currency
}: {
  categories: Array<ExpenseCategory>
  totalCents: number
  currency: string
}) {
  if (categories.length === 0) {
    return <EmptyState title="No Categories" hint="No spending in this period." />
  }

  return (
    <div className="divide-border divide-y">
      {categories.map((category) => {
        const color = categoryColor(category.label)
        const share = totalCents > 0 ? Math.round((category.amountCents / totalCents) * 100) : 0
        const width = category.amountCents > 0 ? Math.max(share, 2) : 0

        return (
          <div key={capitalize(category.label)} className="px-3 py-2">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden className="size-1.5" style={{ backgroundColor: color }} />
                <span className="truncate" style={{ color }}>
                  {capitalize(category.label)}
                </span>
              </span>
              <span className="text-foreground tabular-nums">
                {formatCurrency(category.amountCents, currency)}
              </span>
            </div>
            <div className="bg-muted mt-1.5 h-1">
              <div className="h-full" style={{ width: `${width}%`, backgroundColor: color }} />
            </div>
            <div className="text-muted-foreground mt-1 flex items-center justify-between text-xs tabular-nums">
              <span>{share}%</span>
              <span>
                {category.count} {category.count === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
