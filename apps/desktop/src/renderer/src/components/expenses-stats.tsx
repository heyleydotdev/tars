import { Button } from '@tars/ui/components/button'
import { cn } from '@tars/ui/lib/utils'

import ConsoleHeader from './console-header'
import ConsoleStat from './console-stat'

export default function ExpensesStats({
  period,
  total,
  entries,
  average,
  top,
  month,
  currency,
  currencies,
  onCurrencyChange
}: {
  period: 'day' | 'month'
  total: string
  entries: number
  average: string
  top: string
  month: string
  currency: string
  currencies: Array<string>
  onCurrencyChange: (currency: string) => void
}) {
  return (
    <ConsoleHeader
      title="expenses"
      right={
        <>
          <span className="text-muted-foreground tabular-nums">{month}</span>
          {currencies.length > 1 ? (
            <div role="group" aria-label="Currency" className="flex border">
              {currencies.map((code) => (
                <Button
                  key={code}
                  variant="ghost"
                  size="xs"
                  onClick={() => onCurrencyChange(code)}
                  aria-pressed={code === currency}
                  className={cn(
                    'px-1.5',
                    code === currency
                      ? 'bg-foreground text-background hover:bg-foreground/90 hover:text-background'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  )}
                >
                  {code}
                </Button>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">{currency}</span>
          )}
        </>
      }
    >
      <dl className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <ConsoleStat
          label={period === 'day' ? 'total.day' : 'total.month'}
          value={total}
          tone="text-emerald-400"
        />
        <ConsoleStat label="entries" value={String(entries).padStart(2, '0')} tone="text-sky-400" />
        <ConsoleStat label="avg.tx" value={average} tone="text-amber-300" />
        <ConsoleStat label="top" value={top} className="max-w-36 truncate" title={top} />
      </dl>
    </ConsoleHeader>
  )
}
