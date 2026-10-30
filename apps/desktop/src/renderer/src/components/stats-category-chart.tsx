import { formatCurrency } from '@tars/core/utils/format'
import { capitalize } from '@tars/core/utils/string'

import type { ExpenseCategory } from '../lib/expenses'
import { categoryColor } from '../lib/expenses'
import EmptyState from './empty-state'
import StatsRing from './stats-ring'
import StatsSwatch from './stats-swatch'

const MAX_CATEGORIES = 5

function limitCategories(categories: Array<ExpenseCategory>): Array<ExpenseCategory> {
  if (categories.length <= MAX_CATEGORIES) return categories

  const rest = categories.filter((category) => category.label !== 'other')
  const remainder = [
    ...rest.slice(MAX_CATEGORIES - 1),
    ...categories.filter((category) => category.label === 'other')
  ]

  return [
    ...rest.slice(0, MAX_CATEGORIES - 1),
    {
      label: 'other',
      amountCents: remainder.reduce((total, category) => total + category.amountCents, 0),
      count: remainder.reduce((total, category) => total + category.count, 0)
    }
  ]
}

export default function StatsCategoryChart({
  categories,
  totalCents,
  currency
}: {
  categories: Array<ExpenseCategory>
  totalCents: number
  currency: string
}) {
  if (categories.length === 0) {
    return <EmptyState title="No Categories" hint="Log an expense to split it up." />
  }

  const entries = categories.reduce((total, category) => total + category.count, 0)
  const visible = limitCategories(categories)
  const shares = visible.map((category) =>
    totalCents > 0 ? (category.amountCents / totalCents) * 100 : 0
  )
  const segments = visible.map((category, index) => ({
    ...category,
    share: shares[index] ?? 0,
    offset: shares.slice(0, index).reduce((total, share) => total + share, 0),
    color: categoryColor(category.label)
  }))

  return (
    <div className="flex flex-col items-center gap-4 p-3">
      <StatsRing
        size="size-32"
        label="Spend by category"
        segments={segments.map((segment) => ({
          key: segment.label,
          value: segment.share,
          offset: segment.offset,
          color: segment.color,
          title: `${capitalize(segment.label)}: ${formatCurrency(segment.amountCents, currency)}`
        }))}
      >
        <span className="text-foreground text-lg tabular-nums">{entries}</span>
        <span className="text-muted-foreground text-[10px] tracking-wide uppercase">entries</span>
      </StatsRing>

      <ul className="w-full space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2 text-xs">
            <StatsSwatch color={segment.color} />
            <span className="min-w-0 flex-1 truncate" style={{ color: segment.color }}>
              {capitalize(segment.label)}
            </span>
            <span className="text-muted-foreground w-8 text-right tabular-nums">
              {Math.round(segment.share)}%
            </span>
            <span className="text-foreground text-right tabular-nums">
              {formatCurrency(segment.amountCents, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
