import { PlusIcon } from 'lucide-react'

import { capitalize } from '@tars/core/utils/string'
import { Button } from '@tars/ui/components/button'
import { ButtonGroup } from '@tars/ui/components/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@tars/ui/components/tooltip'

import { categoryColor } from '../lib/expenses'
import { STAT_COLORS } from '../lib/stats-tones'
import ConsoleHeader from './console-header'
import ConsoleStat from './console-stat'
import DeskChatButton from './desk-chat-button'

export default function ExpensesStats({
  onCreate,
  period,
  total,
  entries,
  top,
  month,
  currency,
  currencies,
  onCurrencyChange
}: {
  onCreate: () => void
  period: 'day' | 'month'
  total: string
  entries: number
  top: string
  month: string
  currency: string
  currencies: Array<string>
  onCurrencyChange: (currency: string) => void
}) {
  const topColor = top === '—' ? undefined : categoryColor(top)

  return (
    <ConsoleHeader
      title="expenses"
      right={
        <>
          <span className="text-muted-foreground font-mono tabular-nums">{month}</span>
          {currencies.length > 1 ? (
            <div role="group" aria-label="Currency" className="flex border">
              {currencies.map((code) => (
                <Button
                  key={code}
                  variant={code === currency ? 'default' : 'ghost'}
                  size="xs"
                  onClick={() => onCurrencyChange(code)}
                  aria-pressed={code === currency}
                  className="px-1.5"
                >
                  {code}
                </Button>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground font-mono uppercase">{currency}</span>
          )}
          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="New expense"
                    onClick={onCreate}
                  />
                }
              >
                <PlusIcon />
              </TooltipTrigger>
              <TooltipContent side="bottom">New expense</TooltipContent>
            </Tooltip>
            <DeskChatButton />
          </ButtonGroup>
        </>
      }
    >
      <dl className="flex flex-wrap items-center gap-1.5">
        <ConsoleStat
          label={period === 'day' ? 'total.day' : 'total.month'}
          value={total}
          color={STAT_COLORS.emerald}
        />
        <ConsoleStat
          label="entries"
          value={String(entries).padStart(2, '0')}
          color={STAT_COLORS.sky}
        />
        <ConsoleStat
          label="top"
          value={capitalize(top)}
          color={topColor}
          className="max-w-40"
          title={capitalize(top)}
        />
      </dl>
    </ConsoleHeader>
  )
}
