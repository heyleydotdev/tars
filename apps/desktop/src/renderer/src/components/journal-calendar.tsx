import { useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import type { ReminderItemOutput, TodoItemOutput } from '@tars/core/schemas/journal'
import { toDateKey } from '@tars/core/utils/format'
import { cn } from '@tars/ui/lib/utils'

const WEEKDAYS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa']

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function monthLabel(date: Date): string {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`
}

function buildMonth(view: Date): Array<{ date: Date; outside: boolean }> {
  const year = view.getFullYear()
  const month = view.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1

    return {
      date: new Date(year, month, day),
      outside: day < 1 || day > days
    }
  })
}

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
  const cells = useMemo(() => buildMonth(view), [view])
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
        <span className="text-foreground text-xs tabular-nums">{monthLabel(view)}</span>
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
        {cells.map(({ date, outside }) => {
          const key = toDateKey(date)
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
