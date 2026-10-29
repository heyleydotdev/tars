import { ORPCError } from '@orpc/client'

import type { JournalPageOutput, RecordDoneOutput } from '@tars/core/schemas/journal'
import type { JournalEntrySelect, ReminderSelect, TodoSelect } from '@tars/db/schema'
import { JOURNAL_ITEM_LIMIT } from '@tars/core/constants'
import { recordDoneSchema } from '@tars/core/schemas/journal'
import { journalEntry, reminder, todo } from '@tars/db/schema'
import { and, desc, eq } from '@tars/db/sql'

import { protectedProcedure } from '../context'

type TodoRow = Pick<TodoSelect, 'id' | 'title' | 'status' | 'dueAt' | 'priority' | 'createdAt'>
type ReminderRow = Pick<ReminderSelect, 'id' | 'title' | 'remindAt' | 'status' | 'createdAt'>
type JournalRow = Pick<
  JournalEntrySelect,
  'id' | 'title' | 'content' | 'mood' | 'tags' | 'occurredAt' | 'createdAt'
>

const todoColumns = {
  id: todo.id,
  title: todo.title,
  status: todo.status,
  dueAt: todo.dueAt,
  priority: todo.priority,
  createdAt: todo.createdAt
}
const reminderColumns = {
  id: reminder.id,
  title: reminder.title,
  remindAt: reminder.remindAt,
  status: reminder.status,
  createdAt: reminder.createdAt
}
const journalColumns = {
  id: journalEntry.id,
  title: journalEntry.title,
  content: journalEntry.content,
  mood: journalEntry.mood,
  tags: journalEntry.tags,
  occurredAt: journalEntry.occurredAt,
  createdAt: journalEntry.createdAt
}

function parseTags(value: string): Array<string> {
  try {
    const parsed: unknown = JSON.parse(value)

    if (!Array.isArray(parsed)) return []

    const tags = parsed
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter(Boolean)

    return [...new Set(tags)]
  } catch {
    return []
  }
}

function todoItem(row: TodoRow): JournalPageOutput['todos'][number] {
  return {
    id: row.id,
    title: row.title,
    done: row.status === 'done',
    dueAt: row.dueAt?.toISOString() ?? null,
    priority: row.priority,
    createdAt: row.createdAt.toISOString()
  }
}

function reminderItem(row: ReminderRow): JournalPageOutput['reminders'][number] {
  return {
    id: row.id,
    title: row.title,
    remindAt: row.remindAt.toISOString(),
    status: row.status,
    createdAt: row.createdAt.toISOString()
  }
}

function journalItem(row: JournalRow): JournalPageOutput['journals'][number] {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    mood: row.mood,
    tags: parseTags(row.tags),
    occurredAt: row.occurredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  }
}

function byDueDate(
  left: JournalPageOutput['todos'][number],
  right: JournalPageOutput['todos'][number]
): number {
  if (left.dueAt && right.dueAt) return left.dueAt.localeCompare(right.dueAt)
  if (left.dueAt) return -1
  if (right.dueAt) return 1

  return right.createdAt.localeCompare(left.createdAt)
}

function byJournalDate(
  left: JournalPageOutput['journals'][number],
  right: JournalPageOutput['journals'][number]
): number {
  return (right.occurredAt ?? right.createdAt).localeCompare(left.occurredAt ?? left.createdAt)
}

export const journalRouter = {
  list: protectedProcedure.handler(async ({ context }): Promise<JournalPageOutput> => {
    const userId = context.session.user.id
    const [todos, reminders, journals] = await Promise.all([
      context.db
        .select(todoColumns)
        .from(todo)
        .where(eq(todo.userId, userId))
        .limit(JOURNAL_ITEM_LIMIT),
      context.db
        .select(reminderColumns)
        .from(reminder)
        .where(eq(reminder.userId, userId))
        .orderBy(desc(reminder.remindAt))
        .limit(JOURNAL_ITEM_LIMIT),
      context.db
        .select(journalColumns)
        .from(journalEntry)
        .where(eq(journalEntry.userId, userId))
        .orderBy(desc(journalEntry.createdAt))
        .limit(JOURNAL_ITEM_LIMIT)
    ])

    return {
      todos: todos.map(todoItem).sort(byDueDate),
      reminders: reminders.map(reminderItem),
      journals: journals.map(journalItem).sort(byJournalDate)
    }
  }),

  setTodoDone: protectedProcedure
    .input(recordDoneSchema)
    .handler(async ({ input, context }): Promise<RecordDoneOutput> => {
      const updated: Array<{ id: string }> = await context.db
        .update(todo)
        .set({ status: input.done ? 'done' : 'open' })
        .where(and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)))
        .returning({ id: todo.id })

      if (updated.length === 0) {
        throw new ORPCError('NOT_FOUND')
      }

      return input
    }),

  setReminderDone: protectedProcedure
    .input(recordDoneSchema)
    .handler(async ({ input, context }): Promise<RecordDoneOutput> => {
      const updated: Array<{ id: string }> = await context.db
        .update(reminder)
        .set({ status: input.done ? 'dismissed' : 'pending' })
        .where(and(eq(reminder.id, input.id), eq(reminder.userId, context.session.user.id)))
        .returning({ id: reminder.id })

      if (updated.length === 0) {
        throw new ORPCError('NOT_FOUND')
      }

      return input
    })
}
