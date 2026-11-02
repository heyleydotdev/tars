import { formatCurrency } from '@tars/core/utils/format'
import { capitalize } from '@tars/core/utils/string'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@tars/ui/components/table'

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
    <Table className="border-border border">
      <TableHeader>
        <TableRow>
          <TableHead className="text-muted-foreground">Category</TableHead>
          <TableHead className="text-muted-foreground text-center">Share</TableHead>
          <TableHead className="text-muted-foreground text-right">Amount</TableHead>
          <TableHead className="text-muted-foreground text-right">Entries</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => {
          const color = categoryColor(category.label)
          const share = totalCents > 0 ? Math.round((category.amountCents / totalCents) * 100) : 0
          const width = category.amountCents > 0 ? Math.max(share, 2) : 0

          return (
            <TableRow key={capitalize(category.label)}>
              <TableCell>
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate" style={{ color }}>
                    {capitalize(category.label)}
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="bg-muted flex h-1 w-16">
                    <span
                      className="h-full"
                      style={{ width: `${width}%`, backgroundColor: color }}
                    />
                  </span>
                  <span className="text-muted-foreground font-mono tabular-nums">{share}%</span>
                </div>
              </TableCell>
              <TableCell className="text-foreground text-right font-mono tabular-nums">
                {formatCurrency(category.amountCents, currency)}
              </TableCell>
              <TableCell className="text-muted-foreground text-right font-mono tabular-nums">
                {category.count}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
