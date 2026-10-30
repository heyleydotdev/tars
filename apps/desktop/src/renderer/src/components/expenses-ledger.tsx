import { useMemo } from 'react'
import { PencilIcon, Trash2Icon, XIcon } from 'lucide-react'

import type { ExpenseItemOutput } from '@tars/core/schemas/expenses'
import { formatCurrency, formatTime, toDateKey } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@tars/ui/components/context-menu'

import { categoryColor, expenseAt } from '../lib/expenses'
import { ConsoleEmpty } from './console-panel'

function ExpenseRow({
  item,
  onEdit,
  onDelete
}: {
  item: ExpenseItemOutput
  onEdit: (item: ExpenseItemOutput) => void
  onDelete: (item: ExpenseItemOutput) => void
}) {
  const at = expenseAt(item)
  const color = categoryColor(item.category)

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div className="hover:bg-muted grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-start gap-3 px-3 py-2 transition-colors" />
        }
      >
        <time dateTime={at} className="text-muted-foreground pt-0.5 text-xs tabular-nums">
          {formatTime(at)}
        </time>
        <div className="min-w-0">
          <p className="text-foreground font-sans text-[0.8rem]/6 wrap-break-word">{item.title}</p>
          {item.description && item.description !== item.title ? (
            <p className="text-muted-foreground font-sans text-[0.8rem]/6 wrap-break-word">
              {item.description}
            </p>
          ) : null}
          <span className="mt-0.5 block text-xs" style={{ color }}>{`#${item.category}`}</span>
        </div>
        <span className="text-foreground text-right text-[0.8rem] tabular-nums">
          {formatCurrency(item.amountCents, item.currency)}
        </span>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onEdit(item)}>
          <PencilIcon />
          Edit expense
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onClick={() => onDelete(item)}>
          <Trash2Icon />
          Delete expense
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default function ExpensesLedger({
  items,
  currency,
  selectedDay,
  onClearDay,
  onEdit,
  onDelete
}: {
  items: Array<ExpenseItemOutput>
  currency: string
  selectedDay: Date | null
  onClearDay: () => void
  onEdit: (item: ExpenseItemOutput) => void
  onDelete: (item: ExpenseItemOutput) => void
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
        <div className="bg-muted/10 flex items-center gap-2 border-b px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">filter=</span>
          <Button
            variant="outline"
            size="xs"
            onClick={onClearDay}
            aria-label={`Clear day filter ${toDateKey(selectedDay)}`}
          >
            day:{toDateKey(selectedDay)}
            <XIcon className="size-3" />
          </Button>
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
              <div className="bg-muted/20 flex items-center justify-between border-b px-3 py-1.5 text-xs backdrop-blur lg:sticky lg:top-0 lg:z-10">
                <span className="text-foreground tabular-nums">{group.key}</span>
                <span className="text-muted-foreground tabular-nums">
                  {group.items.length} · {formatCurrency(group.total, currency)}
                </span>
              </div>
              {group.items.map((item) => (
                <ExpenseRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
