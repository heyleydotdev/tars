import { useMemo } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import {
  buildMonthGrid,
  formatCurrency,
  shiftMonth,
  toDateKey,
  toMonthKey
} from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import { cn } from '@tars/ui/lib/utils'

const WEEKDAYS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa']

export default function ExpensesCalendar({
  month,
  selected,
  dailyTotals,
  currency,
  onMonthChange,
  onSelect,
  onToday
}: {
  month: Date
  selected: Date | null
  dailyTotals: Map<string, number>
  currency: string
  onMonthChange: (date: Date) => void
  onSelect: (date: Date) => void
  onToday: () => void
}) {
  const cells = useMemo(() => buildMonthGrid(month), [month])
  const selectedKey = selected ? toDateKey(selected) : null
  const todayKey = toDateKey(new Date())
  const maxDaily = useMemo(
    () =>
      Math.max(
        0,
        ...cells.filter((cell) => !cell.outside).map((cell) => dailyTotals.get(cell.key) ?? 0)
      ),
    [cells, dailyTotals]
  )

  return (
    <div className="p-3">
      <div className="flex items-center justify-between border-b pb-2">
        <span className="text-foreground text-xs tabular-nums">
          {toMonthKey(month).replace('-', '.')}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={onToday}>
            today
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next month"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <div className="text-muted-foreground mt-2 grid grid-cols-7 text-xs uppercase">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="py-1 text-center">
            {weekday}
          </span>
        ))}
      </div>

      <div className="bg-border grid grid-cols-7 gap-px overflow-hidden border">
        {cells.map(({ date, key, outside }) => {
          const spend = outside ? 0 : (dailyTotals.get(key) ?? 0)
          const ratio = maxDaily > 0 ? spend / maxDaily : 0
          const isSelected = key === selectedKey
          const isToday = key === todayKey

          return (
            <button
              key={key}
              type="button"
              aria-label={`${date.toDateString()}${spend > 0 ? `, ${formatCurrency(spend, currency)}` : ''}`}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              title={spend > 0 ? formatCurrency(spend, currency) : undefined}
              onClick={() => onSelect(date)}
              className={cn(
                'bg-background hover:bg-muted/40 focus-visible:ring-ring/50 relative flex h-9 flex-col items-center justify-center gap-0.5 text-xs tabular-nums transition-colors focus-visible:ring-1 focus-visible:outline-none focus-visible:ring-inset',
                outside
                  ? 'text-muted'
                  : isToday && !isSelected
                    ? 'text-emerald-400'
                    : 'text-foreground'
              )}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center',
                  isSelected && 'text-background bg-emerald-400 font-medium'
                )}
              >
                {date.getDate()}
              </span>
              {spend > 0 ? (
                <span aria-hidden className="bg-muted absolute inset-x-1.5 bottom-1 h-1">
                  <span
                    className="block h-full bg-emerald-400"
                    style={{ width: `${Math.max(ratio * 100, 8)}%` }}
                  />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 bg-emerald-400" />
          daily spend
        </span>
        <span className="ml-auto tabular-nums">{selected ? toDateKey(selected) : 'all month'}</span>
      </div>
    </div>
  )
}
