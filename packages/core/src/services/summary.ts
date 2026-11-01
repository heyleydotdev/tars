import type { Database } from '@tars/db/client'
import {
  expense,
  incident,
  incidentAnalysis,
  journalEntry,
  measureRun,
  reminder,
  todo
} from '@tars/db/schema'
import { and, desc, eq, gte, like, lt, notLike } from '@tars/db/sql'

import type { SummaryPeriod } from '../schemas/chat'
import { SUMMARY_NOTE_LIMIT } from '../constants'

export type SummaryNote = {
  occurredAt: string
  title: string | null
  content: string
  mood: string | null
}

export type SummaryCurrencyTotal = {
  currency: string
  totalCents: number
  count: number
  categories: Array<{ category: string; totalCents: number }>
}

export type SummaryData = {
  period: SummaryPeriod
  from: Date
  to: Date
  label: string
  notes: Array<SummaryNote>
  counts: {
    notes: number
    tasksDone: number
    tasksOpen: number
    tasksDue: number
    remindersSent: number
    remindersPending: number
    incidentsOpened: number
    incidentsApproved: number
    measurements: number
  }
  totals: Array<SummaryCurrencyTotal>
  incidentTitles: Array<string>
  hasActivity: boolean
}

export async function loadSummaryData(
  db: Database,
  userId: string,
  range: { period: SummaryPeriod; from: Date; to: Date; label: string }
): Promise<SummaryData> {
  const { period, from, to, label } = range
  const [
    notes,
    activity,
    openTodos,
    dueTodos,
    reminders,
    expenses,
    opened,
    approved,
    measurements
  ] = await Promise.all([
    db
      .select({
        occurredAt: journalEntry.occurredAt,
        title: journalEntry.title,
        content: journalEntry.content,
        mood: journalEntry.mood
      })
      .from(journalEntry)
      .where(
        and(
          eq(journalEntry.userId, userId),
          notLike(journalEntry.id, 'activity-%'),
          gte(journalEntry.occurredAt, from),
          lt(journalEntry.occurredAt, to)
        )
      )
      .orderBy(desc(journalEntry.occurredAt))
      .limit(SUMMARY_NOTE_LIMIT),
    db
      .select({ id: journalEntry.id })
      .from(journalEntry)
      .where(
        and(
          eq(journalEntry.userId, userId),
          like(journalEntry.id, 'activity-%'),
          gte(journalEntry.occurredAt, from),
          lt(journalEntry.occurredAt, to)
        )
      ),
    db
      .select({ id: todo.id })
      .from(todo)
      .where(and(eq(todo.userId, userId), eq(todo.status, 'open'))),
    db
      .select({ id: todo.id })
      .from(todo)
      .where(and(eq(todo.userId, userId), gte(todo.dueAt, from), lt(todo.dueAt, to))),
    db
      .select({ status: reminder.status })
      .from(reminder)
      .where(
        and(eq(reminder.userId, userId), gte(reminder.remindAt, from), lt(reminder.remindAt, to))
      ),
    db
      .select({
        amountCents: expense.amountCents,
        currency: expense.currency,
        category: expense.category
      })
      .from(expense)
      .where(
        and(eq(expense.userId, userId), gte(expense.occurredAt, from), lt(expense.occurredAt, to))
      ),
    db
      .select({ id: incident.id, title: incident.title })
      .from(incident)
      .where(
        and(eq(incident.userId, userId), gte(incident.createdAt, from), lt(incident.createdAt, to))
      ),
    db
      .select({ id: incidentAnalysis.id })
      .from(incidentAnalysis)
      .innerJoin(incident, eq(incident.id, incidentAnalysis.incidentId))
      .where(
        and(
          eq(incident.userId, userId),
          eq(incidentAnalysis.status, 'approved'),
          gte(incidentAnalysis.approvedAt, from),
          lt(incidentAnalysis.approvedAt, to)
        )
      ),
    db
      .select({ id: measureRun.id })
      .from(measureRun)
      .where(
        and(
          eq(measureRun.userId, userId),
          gte(measureRun.createdAt, from),
          lt(measureRun.createdAt, to)
        )
      )
  ])

  let tasksDone = 0

  for (const row of activity) {
    if (row.id.startsWith('activity-task-')) tasksDone += 1
  }

  const totals = new Map<
    string,
    { totalCents: number; count: number; categories: Map<string, number> }
  >()

  for (const item of expenses) {
    const current = totals.get(item.currency) ?? {
      totalCents: 0,
      count: 0,
      categories: new Map<string, number>()
    }
    const category = item.category ?? 'other'

    current.totalCents += item.amountCents
    current.count += 1
    current.categories.set(category, (current.categories.get(category) ?? 0) + item.amountCents)
    totals.set(item.currency, current)
  }

  const summaryNotes: Array<SummaryNote> = notes.map((note) => ({
    occurredAt: note.occurredAt.toISOString(),
    title: note.title,
    content: note.content,
    mood: note.mood
  }))
  const summaryTotals: Array<SummaryCurrencyTotal> = [...totals.entries()]
    .map(([currency, value]) => ({
      currency,
      totalCents: value.totalCents,
      count: value.count,
      categories: [...value.categories.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([category, totalCents]) => ({ category, totalCents }))
    }))
    .sort((left, right) => right.totalCents - left.totalCents)

  const hasActivity =
    summaryNotes.length > 0 ||
    activity.length > 0 ||
    summaryTotals.length > 0 ||
    reminders.length > 0 ||
    opened.length > 0 ||
    approved.length > 0 ||
    measurements.length > 0 ||
    dueTodos.length > 0

  return {
    period,
    from,
    to,
    label,
    notes: summaryNotes,
    counts: {
      notes: summaryNotes.length,
      tasksDone,
      tasksOpen: openTodos.length,
      tasksDue: dueTodos.length,
      remindersSent: reminders.filter((row) => row.status === 'sent').length,
      remindersPending: reminders.filter((row) => row.status === 'pending').length,
      incidentsOpened: opened.length,
      incidentsApproved: approved.length,
      measurements: measurements.length
    },
    totals: summaryTotals,
    incidentTitles: opened.map((row) => row.title),
    hasActivity
  }
}
