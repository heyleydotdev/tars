import { formatCurrency } from '@tars/core/utils/format'
import { cn } from '@tars/ui/lib/utils'

import type { ExpenseCategory } from '../lib/expenses'
import { categoryColor } from '../lib/expenses'
import { ConsoleEmpty } from './console-panel'

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
    return <ConsoleEmpty title="no categories" hint="no spending in this period" />
  }

  return (
    <div className="divide-border divide-y">
      {categories.map((category) => {
        const color = categoryColor(category.label)
        const share = totalCents > 0 ? Math.round((category.amountCents / totalCents) * 100) : 0
        const width = category.amountCents > 0 ? Math.max(share, 2) : 0

        return (
          <div key={category.label} className="px-3 py-2">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden className={cn('size-1.5', color.dot)} />
                <span className="text-foreground truncate">{category.label}</span>
              </span>
              <span className="text-foreground tabular-nums">
                {formatCurrency(category.amountCents, currency)}
              </span>
            </div>
            <div className="bg-muted mt-1.5 h-1">
              <div className={cn('h-full', color.bar)} style={{ width: `${width}%` }} />
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
