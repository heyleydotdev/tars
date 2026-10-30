import type { ExpenseItemOutput } from '@tars/core/schemas/expenses'
import type {
  JournalItemOutput,
  ReminderItemOutput,
  TodoItemOutput
} from '@tars/core/schemas/journal'
import { formatCurrency, startOfMonth, toDateKey, toMonthKey } from '@tars/core/utils/format'

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'short' })

export function dayLabel(date: Date): string {
  return dayFormat.format(date).toUpperCase()
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

type ActivityCell = {
  key: string
  date: Date
  count: number
  future: boolean
}

export type ActivitySummary = {
  cells: Array<ActivityCell>
  total: number
  activeDays: number
  busiest: ActivityCell | null
  streak: number
}

type StatsRecords = {
  journals: Array<JournalItemOutput>
  todos: Array<TodoItemOutput>
  reminders: Array<ReminderItemOutput>
  expenses: Array<ExpenseItemOutput>
}

export function buildActivity(records: StatsRecords, weeks = 13): ActivitySummary {
  const today = startOfDay(new Date())
  const todayKey = toDateKey(today)
  const gridStart = addDays(today, -((weeks - 1) * 7 + today.getDay()))
  const startKey = toDateKey(gridStart)
  const counts = new Map<string, number>()

  const bump = (value: string): void => {
    const key = toDateKey(value)

    if (key >= startKey && key <= todayKey) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  for (const entry of records.journals) bump(entry.occurredAt)
  for (const item of records.expenses) bump(item.occurredAt)
  for (const item of records.todos) bump(item.createdAt)
  for (const item of records.reminders) bump(item.createdAt)

  const cells = Array.from({ length: weeks * 7 }, (_, index): ActivityCell => {
    const date = addDays(gridStart, index)

    return {
      key: toDateKey(date),
      date,
      count: 0,
      future: date.getTime() > today.getTime()
    }
  })

  let total = 0
  let activeDays = 0
  let busiest: ActivityCell | null = null

  for (const cell of cells) {
    if (cell.future) continue

    cell.count = counts.get(cell.key) ?? 0

    if (cell.count > 0) {
      total += cell.count
      activeDays += 1

      if (!busiest || cell.count > busiest.count) busiest = cell
    }
  }

  let streak = 0
  let skipToday = true

  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const cell = cells[index]

    if (!cell) break
    if (cell.future) continue

    if (cell.count > 0) {
      streak += 1
      skipToday = false
      continue
    }

    if (skipToday && cell.key === todayKey) {
      skipToday = false
      continue
    }

    break
  }

  return { cells, total, activeDays, busiest, streak }
}

export function countRecordStates(
  todos: Array<TodoItemOutput>,
  reminders: Array<ReminderItemOutput>
): {
  openTasks: number
  doneTasks: number
  pendingReminders: number
  sentReminders: number
  dismissedReminders: number
} {
  let openTasks = 0
  let pendingReminders = 0
  let sentReminders = 0

  for (const todo of todos) {
    if (!todo.done) openTasks += 1
  }

  for (const reminder of reminders) {
    if (reminder.status === 'pending') pendingReminders += 1
    if (reminder.status === 'sent') sentReminders += 1
  }

  return {
    openTasks,
    doneTasks: todos.length - openTasks,
    pendingReminders,
    sentReminders,
    dismissedReminders: reminders.length - pendingReminders - sentReminders
  }
}

export function dominantCurrency(items: Array<ExpenseItemOutput>): string {
  const counts = new Map<string, number>()

  for (const item of items) {
    counts.set(item.currency, (counts.get(item.currency) ?? 0) + 1)
  }

  let currency = 'USD'
  let max = 0

  for (const [code, count] of counts) {
    if (count > max) {
      currency = code
      max = count
    }
  }

  return currency
}

export type SpendPoint = {
  key: string
  label: string
  amountCents: number
}

export function buildMonthlySpend(
  items: Array<ExpenseItemOutput>,
  months = 6
): { points: Array<SpendPoint>; totalCents: number; maxCents: number } {
  const current = startOfMonth(new Date())
  const points = Array.from({ length: months }, (_, index) => {
    const date = new Date(current.getFullYear(), current.getMonth() + index - (months - 1), 1)

    return {
      key: toMonthKey(date),
      label: monthFormat.format(date).toUpperCase(),
      amountCents: 0
    }
  })
  const byKey = new Map(points.map((point) => [point.key, point]))

  for (const item of items) {
    const point = byKey.get(toMonthKey(item.occurredAt))

    if (point) point.amountCents += item.amountCents
  }

  return {
    points,
    totalCents: points.reduce((total, point) => total + point.amountCents, 0),
    maxCents: Math.max(0, ...points.map((point) => point.amountCents))
  }
}

export type ActivityKind = 'note' | 'expense' | 'task' | 'reminder'

export type ActivityState = 'open' | 'done' | 'pending' | 'sent' | 'dismissed'

export type ActivityEvent = {
  id: string
  at: string
  kind: ActivityKind
  title: string
  meta: string | null
  state: ActivityState | null
}

export function buildRecentActivity(records: StatsRecords, limit = 8): Array<ActivityEvent> {
  const events: Array<ActivityEvent> = [
    ...records.journals.map((entry) => ({
      id: `note-${entry.id}`,
      at: entry.occurredAt,
      kind: 'note' as const,
      title: entry.title ?? entry.content,
      meta: entry.mood,
      state: null
    })),
    ...records.expenses.map((item) => ({
      id: `expense-${item.id}`,
      at: item.occurredAt,
      kind: 'expense' as const,
      title: item.title,
      meta: formatCurrency(item.amountCents, item.currency),
      state: null
    })),
    ...records.todos.map((item) => ({
      id: `task-${item.id}`,
      at: item.createdAt,
      kind: 'task' as const,
      title: item.title,
      meta: null,
      state: item.done ? ('done' as const) : ('open' as const)
    })),
    ...records.reminders.map((item) => ({
      id: `reminder-${item.id}`,
      at: item.createdAt,
      kind: 'reminder' as const,
      title: item.title,
      meta: null,
      state: item.status
    }))
  ]

  return events.sort((left, right) => right.at.localeCompare(left.at)).slice(0, limit)
}
