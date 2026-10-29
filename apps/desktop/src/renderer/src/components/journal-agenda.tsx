import type { ReminderItemOutput, TodoItemOutput } from '@tars/core/schemas/journal'
import { formatTime } from '@tars/core/utils/format'
import { cn } from '@tars/ui/lib/utils'

import { ConsoleEmpty } from './console-panel'

export default function JournalAgenda({
  reminders,
  todos,
  onToggleReminder,
  onToggleTodo
}: {
  reminders: Array<ReminderItemOutput>
  todos: Array<TodoItemOutput>
  onToggleReminder: (id: string, done: boolean) => void
  onToggleTodo: (id: string, done: boolean) => void
}) {
  const items = [
    ...reminders.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      recordId: reminder.id,
      title: reminder.title,
      at: reminder.remindAt,
      kind: 'rem' as const,
      done: reminder.status === 'dismissed',
      createdAt: reminder.createdAt,
      meta: reminder.status === 'sent' ? 'status=sent' : null
    })),
    ...todos.map((todo) => ({
      id: `task-${todo.id}`,
      recordId: todo.id,
      title: todo.title,
      at: todo.dueAt ?? '',
      kind: 'task' as const,
      done: todo.done,
      createdAt: todo.createdAt,
      meta: todo.priority ? `p=${todo.priority}` : null
    }))
  ].sort(
    (left, right) =>
      left.at.localeCompare(right.at) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  )

  if (items.length === 0) {
    return <ConsoleEmpty title="nothing scheduled" hint="select a marked day" />
  }

  return (
    <div className="divide-border divide-y">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            const done = !item.done

            if (item.kind === 'rem') {
              onToggleReminder(item.recordId, done)
            } else {
              onToggleTodo(item.recordId, done)
            }
          }}
          aria-pressed={item.done}
          aria-label={`${item.done ? 'Mark as not done' : 'Mark as done'}: ${item.title} (${item.kind === 'rem' ? 'reminder' : 'task'})`}
          className="group hover:bg-muted/20 focus-visible:bg-muted/30 flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors focus-visible:outline-none"
        >
          <span
            className={cn(
              'mt-px text-xs tabular-nums',
              item.done ? 'text-emerald-400' : 'text-muted-foreground group-hover:text-foreground'
            )}
          >
            {item.done ? '[x]' : '[ ]'}
          </span>
          <span className="text-muted-foreground mt-0.5 w-10 shrink-0 text-xs tabular-nums">
            {formatTime(item.at)}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                'text-foreground block text-[13px] leading-5 wrap-break-word',
                item.done && 'text-muted-foreground line-through'
              )}
            >
              {item.title}
            </span>
            {item.meta ? (
              <span className="text-muted-foreground mt-0.5 block text-xs">{item.meta}</span>
            ) : null}
          </span>
          <span
            className={cn(
              'pt-0.5 text-xs tracking-[0.12em] uppercase',
              item.kind === 'rem' ? 'text-amber-300' : 'text-sky-400'
            )}
          >
            {item.kind}
          </span>
        </button>
      ))}
    </div>
  )
}
