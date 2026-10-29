import { useMemo } from 'react'
import { XIcon } from 'lucide-react'

import type { ExpenseItemOutput } from '@tars/core/schemas/expenses'
import { formatCurrency, formatTime, toDateKey } from '@tars/core/utils/format'
import { cn } from '@tars/ui/lib/utils'

import { categoryColor, categoryLabel, expenseAt } from '../lib/expenses'
import { ConsoleEmpty } from './console-panel'

function ExpenseRow({ item }: { item: ExpenseItemOutput }) {
  const at = expenseAt(item)
  const color = categoryColor(item.category)

  return (
    <div className="hover:bg-muted/20 grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-start gap-3 px-3 py-2 transition-colors">
      <time dateTime={at} className="text-muted-foreground pt-0.5 text-xs tabular-nums">
        {formatTime(at)}
      </time>
      <div className="min-w-0">
        <p className="text-foreground text-[13px] leading-5 wrap-break-word">{item.description}</p>
        {item.category ? (
          <span className={cn('mt-0.5 flex items-center gap-1.5 text-xs', color.text)}>
            <span aria-hidden className={cn('size-1 rounded-full', color.dot)} />
            {`#${categoryLabel(item.category)}`}
          </span>
        ) : null}
      </div>
      <span className="text-foreground text-right text-[13px] tabular-nums">
        {formatCurrency(item.amountCents, item.currency)}
      </span>
    </div>
  )
}

export default function ExpensesLedger({
  items,
  currency,
  selectedDay,
  onClearDay
}: {
  items: Array<ExpenseItemOutput>
  currency: string
  selectedDay: Date | null
  onClearDay: () => void
}) {
  const groups = useMemo(() => {
    const sorted = [...items].sort((left, right) => expenseAt(right).localeCompare(expenseAt(left)))
    const result: Array<{ key: string; items: Array<ExpenseItemOutput>; total: number }> = []

    for (const item of sorted) {
      const key = toDateKey(expenseAt(item))
      const group = result.at(-1)

      if (group?.key === key) {
        group.items.push(item)
        group.total += item.amountCents
      } else {
        result.push({ key, items: [item], total: item.amountCents })
      }
    }

    return result
  }, [items])

  return (
    <div className="flex h-full flex-col">
      {selectedDay ? (
        <div className="border-border bg-muted/10 flex items-center gap-2 border-b px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">filter=</span>
          <button
            type="button"
            onClick={onClearDay}
            aria-label={`Clear day filter ${toDateKey(selectedDay)}`}
            className="border-border text-foreground hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-1 border px-1.5 py-0.5 transition-colors focus-visible:ring-1 focus-visible:outline-none"
          >
            day:{toDateKey(selectedDay)}
            <XIcon className="size-3" />
          </button>
          <span className="text-muted-foreground ml-auto tabular-nums">{items.length} items</span>
        </div>
      ) : null}

      {groups.length === 0 ? (
        <div className="flex-1">
          <ConsoleEmpty
            title="no expenses"
            hint={selectedDay ? 'this day is clear' : 'tell tars what you spent'}
          />
        </div>
      ) : (
        <div>
          {groups.map((group) => (
            <section key={group.key}>
              <div className="border-border bg-muted/20 flex items-center justify-between border-b px-3 py-1.5 text-xs backdrop-blur lg:sticky lg:top-0 lg:z-10">
                <span className="text-foreground tabular-nums">{group.key}</span>
                <span className="text-muted-foreground tabular-nums">
                  {group.items.length} · {formatCurrency(group.total, currency)}
                </span>
              </div>
              {group.items.map((item) => (
                <ExpenseRow key={item.id} item={item} />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
