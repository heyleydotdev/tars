import { useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import type { ReminderItemOutput, TodoItemOutput } from '@tars/core/schemas/journal'
import {
  buildMonthGrid,
  shiftMonth,
  startOfMonth,
  toDateKey,
  toMonthKey
} from '@tars/core/utils/format'
import { cn } from '@tars/ui/lib/utils'

const WEEKDAYS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa']

export default function JournalCalendar({
  selected,
  onSelect,
  reminders,
  todos
}: {
  selected: Date
  onSelect: (date: Date) => void
  reminders: Array<ReminderItemOutput>
  todos: Array<TodoItemOutput>
}) {
  const [view, setView] = useState(() => startOfMonth(selected))
  const cells = useMemo(() => buildMonthGrid(view), [view])
  const selectedKey = toDateKey(selected)
  const todayKey = toDateKey(new Date())
  const reminderKeys = useMemo(
    () => new Set(reminders.map((reminder) => toDateKey(reminder.remindAt))),
    [reminders]
  )
  const todoKeys = useMemo(
    () => new Set(todos.flatMap((todo) => (todo.dueAt ? [toDateKey(todo.dueAt)] : []))),
    [todos]
  )

  return (
    <div className="p-3">
      <div className="border-border flex items-center justify-between border-b pb-2">
        <span className="text-foreground text-xs tabular-nums">
          {toMonthKey(view).replace('-', '.')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setView(shiftMonth(view, -1))}
            className="border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground focus-visible:ring-ring flex size-7 items-center justify-center border transition-colors focus-visible:ring-1 focus-visible:outline-none"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setView(shiftMonth(view, 1))}
            className="border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground focus-visible:ring-ring flex size-7 items-center justify-center border transition-colors focus-visible:ring-1 focus-visible:outline-none"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="text-muted-foreground mt-2 grid grid-cols-7 text-xs uppercase">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="py-1 text-center">
            {weekday}
          </span>
        ))}
      </div>

      <div className="border-border bg-border grid grid-cols-7 gap-px overflow-hidden border">
        {cells.map(({ date, key, outside }) => {
          const isSelected = key === selectedKey
          const isToday = key === todayKey

          return (
            <button
              key={key}
              type="button"
              aria-label={date.toDateString()}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              onClick={() => {
                onSelect(date)
                if (outside) setView(startOfMonth(date))
              }}
              className={cn(
                'bg-background hover:bg-muted/40 focus-visible:ring-ring relative flex h-8 flex-col items-center justify-center gap-0.5 text-xs tabular-nums transition-colors focus-visible:ring-1 focus-visible:outline-none focus-visible:ring-inset',
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
              <span aria-hidden className="flex h-1 items-center gap-0.5">
                {reminderKeys.has(key) ? (
                  <span aria-hidden className="size-1 rounded-full bg-amber-400" />
                ) : null}
                {todoKeys.has(key) ? (
                  <span aria-hidden className="size-1 rounded-full bg-sky-400" />
                ) : null}
              </span>
            </button>
          )
        })}
      </div>

      <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-1 rounded-full bg-amber-400" />
          reminder
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-1 rounded-full bg-sky-400" />
          task
        </span>
        <span className="ml-auto tabular-nums">{toDateKey(selected)}</span>
      </div>
    </div>
  )
}
