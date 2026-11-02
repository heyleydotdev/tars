import { describe, expect, it } from 'vitest'

import type { ExpenseItemOutput } from '@tars/core/schemas/expenses'
import type {
  JournalItemOutput,
  ReminderItemOutput,
  TodoItemOutput
} from '@tars/core/schemas/journal'
import { toDateKey, toMonthKey } from '@tars/core/utils/format'

import {
  buildActivity,
  buildMonthlySpend,
  buildRecentActivity,
  countRecordStates,
  dominantCurrency
} from '../../src/renderer/src/lib/stats'

const now = new Date()

function at(daysAgo: number, hour = 12): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour).toISOString()
}

function journal(overrides: Partial<JournalItemOutput> = {}): JournalItemOutput {
  return {
    id: 'journal-1',
    title: 'Note',
    content: 'Note body',
    mood: null,
    tags: [],
    occurredAt: at(0),
    ...overrides
  }
}

function todo(overrides: Partial<TodoItemOutput> = {}): TodoItemOutput {
  return {
    id: 'todo-1',
    title: 'Task',
    done: false,
    dueAt: null,
    createdAt: at(0),
    ...overrides
  }
}

function reminder(overrides: Partial<ReminderItemOutput> = {}): ReminderItemOutput {
  return {
    id: 'reminder-1',
    title: 'Reminder',
    remindAt: at(0),
    status: 'pending',
    createdAt: at(0),
    ...overrides
  }
}

function expense(overrides: Partial<ExpenseItemOutput> = {}): ExpenseItemOutput {
  return {
    id: 'expense-1',
    title: 'Coffee',
    description: '',
    amountCents: 450,
    currency: 'USD',
    category: 'food',
    occurredAt: at(0),
    ...overrides
  }
}

function emptyRecords() {
  return { journals: [], todos: [], reminders: [], expenses: [] }
}

describe('buildActivity', () => {
  it('marks days after today as future and ignores records dated ahead', () => {
    const summary = buildActivity(
      { ...emptyRecords(), journals: [journal({ occurredAt: at(-1) })] },
      2
    )
    const today = toDateKey(new Date())
    const future = summary.cells.filter((cell) => cell.future)

    expect(summary.cells).toHaveLength(14)
    expect(summary.cells.find((cell) => cell.key === today)?.future).toBe(false)
    expect(future.every((cell) => cell.key > today)).toBe(true)
    expect(summary.total).toBe(0)
  })

  it('counts each record kind into its own day and flags the busiest day', () => {
    const summary = buildActivity(
      {
        journals: [journal({ occurredAt: at(0) }), journal({ id: 'journal-2', occurredAt: at(0) })],
        expenses: [expense({ occurredAt: at(0) })],
        todos: [todo({ createdAt: at(0) })],
        reminders: [reminder({ createdAt: at(0) })]
      },
      2
    )

    expect(summary.total).toBe(5)
    expect(summary.activeDays).toBe(1)
    expect(summary.busiest?.key).toBe(toDateKey(new Date()))
    expect(summary.busiest?.count).toBe(5)
  })

  it('ignores records older than the grid', () => {
    const summary = buildActivity(
      {
        journals: [journal({ occurredAt: at(30) })],
        expenses: [expense({ occurredAt: at(30) })],
        todos: [todo({ createdAt: at(30) })],
        reminders: [reminder({ createdAt: at(30) })]
      },
      2
    )

    expect(summary.total).toBe(0)
    expect(summary.busiest).toBeNull()
  })

  it('counts a streak that ends today or yesterday', () => {
    expect(
      buildActivity(
        {
          ...emptyRecords(),
          journals: [journal({ occurredAt: at(0) }), journal({ id: 'j2', occurredAt: at(1) })]
        },
        2
      ).streak
    ).toBe(2)

    expect(
      buildActivity({ ...emptyRecords(), journals: [journal({ occurredAt: at(1) })] }, 2).streak
    ).toBe(1)
  })

  it('stops the streak at the first empty day before yesterday', () => {
    const summary = buildActivity(
      { ...emptyRecords(), journals: [journal({ occurredAt: at(2) })] },
      2
    )

    expect(summary.streak).toBe(0)
  })
})

describe('countRecordStates', () => {
  it('splits tasks and reminders by state', () => {
    const states = countRecordStates(
      [todo({ id: 'a' }), todo({ id: 'b' }), todo({ id: 'c', done: true })],
      [
        reminder({ id: 'r1' }),
        reminder({ id: 'r2', status: 'sent' }),
        reminder({ id: 'r3', status: 'dismissed' })
      ]
    )

    expect(states).toEqual({
      openTasks: 2,
      doneTasks: 1,
      pendingReminders: 1,
      sentReminders: 1,
      dismissedReminders: 1
    })
  })
})

describe('dominantCurrency', () => {
  it('falls back to USD when there are no expenses', () => {
    expect(dominantCurrency([])).toBe('USD')
  })

  it('returns the most frequent currency', () => {
    expect(
      dominantCurrency([
        expense({ currency: 'USD' }),
        expense({ id: 'e2', currency: 'USD' }),
        expense({ id: 'e3', currency: 'EUR' })
      ])
    ).toBe('USD')
  })
})

describe('buildMonthlySpend', () => {
  it('buckets spend into the trailing months and ignores older items', () => {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString()
    const old = new Date(now.getFullYear(), now.getMonth() - 7, 10).toISOString()
    const spend = buildMonthlySpend([
      expense({ amountCents: 1000 }),
      expense({ id: 'e2', amountCents: 500, occurredAt: lastMonth }),
      expense({ id: 'e3', amountCents: 9999, occurredAt: old })
    ])

    expect(spend.points).toHaveLength(6)
    expect(spend.points.at(-1)?.key).toBe(toMonthKey(new Date()))
    expect(spend.totalCents).toBe(1500)
    expect(spend.maxCents).toBe(1000)
  })
})

describe('buildRecentActivity', () => {
  it('merges every record kind newest first', () => {
    const events = buildRecentActivity(
      {
        journals: [journal({ occurredAt: at(0), title: null, content: 'Standup notes' })],
        expenses: [expense({ occurredAt: at(1) })],
        todos: [todo({ createdAt: at(2) })],
        reminders: [reminder({ createdAt: at(3) })]
      },
      4
    )

    expect(events.map((event) => event.kind)).toEqual(['note', 'expense', 'task', 'reminder'])
    expect(events.map((event) => event.id)).toEqual([
      'note-journal-1',
      'expense-expense-1',
      'task-todo-1',
      'reminder-reminder-1'
    ])
    expect(events[0]?.title).toBe('Standup notes')
    expect(events[0]?.meta).toBeNull()
    expect(events[2]?.state).toBe('open')
    expect(events[3]?.state).toBe('pending')
  })

  it('applies the limit after sorting', () => {
    const events = buildRecentActivity(
      {
        ...emptyRecords(),
        journals: [journal({ occurredAt: at(0) }), journal({ id: 'j2', occurredAt: at(1) })]
      },
      1
    )

    expect(events).toHaveLength(1)
    expect(events[0]?.id).toBe('note-journal-1')
  })
})
