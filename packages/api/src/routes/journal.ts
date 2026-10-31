import type { JournalPageOutput, RecordDoneOutput } from '@tars/core/schemas/journal'
import type { JournalEntrySelect, ReminderSelect, TodoSelect } from '@tars/db/schema'
import { JOURNAL_ITEM_LIMIT } from '@tars/core/constants'
import {
  recordDoneSchema,
  updateJournalSchema,
  updateReminderSchema,
  updateTodoSchema
} from '@tars/core/schemas/journal'
import { deleteRecordSchema } from '@tars/core/schemas/records'
import { parseDate } from '@tars/core/utils/format'
import { journalEntry, reminder, todo } from '@tars/db/schema'
import { and, desc, eq } from '@tars/db/sql'

import { protectedProcedure } from '../context'
import { NotFoundError } from '../errors'

type TodoRow = Pick<TodoSelect, 'id' | 'title' | 'status' | 'dueAt' | 'priority' | 'createdAt'>
type ReminderRow = Pick<ReminderSelect, 'id' | 'title' | 'remindAt' | 'status' | 'createdAt'>
type JournalRow = Pick<
  JournalEntrySelect,
  'id' | 'title' | 'content' | 'mood' | 'tags' | 'occurredAt'
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
  occurredAt: journalEntry.occurredAt
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
    occurredAt: row.occurredAt.toISOString()
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
  return right.occurredAt.localeCompare(left.occurredAt)
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
        .orderBy(desc(journalEntry.occurredAt))
        .limit(JOURNAL_ITEM_LIMIT)
    ])

    return {
      todos: todos.map(todoItem).sort(byDueDate),
      reminders: reminders.map(reminderItem),
      journals: journals.map(journalItem).sort(byJournalDate)
    }
  }),

  updateEntry: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(updateJournalSchema)
    .handler(async ({ input, context, errors }): Promise<{ id: string }> => {
      const updated: Array<{ id: string }> = await context.db
        .update(journalEntry)
        .set({
          title: input.title,
          content: input.content,
          mood: input.mood,
          tags: JSON.stringify(input.tags),
          occurredAt: new Date(input.occurredAt)
        })
        .where(and(eq(journalEntry.id, input.id), eq(journalEntry.userId, context.session.user.id)))
        .returning({ id: journalEntry.id })

      if (updated.length === 0) {
        throw errors.NOT_FOUND()
      }

      return { id: input.id }
    }),

  updateTodo: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(updateTodoSchema)
    .handler(async ({ input, context, errors }): Promise<{ id: string }> => {
      const updated: Array<{ id: string }> = await context.db
        .update(todo)
        .set({
          title: input.title,
          dueAt: parseDate(input.dueAt),
          priority: input.priority
        })
        .where(and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)))
        .returning({ id: todo.id })

      if (updated.length === 0) {
        throw errors.NOT_FOUND()
      }

      return { id: input.id }
    }),

  updateReminder: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(updateReminderSchema)
    .handler(async ({ input, context, errors }): Promise<{ id: string }> => {
      const updated: Array<{ id: string }> = await context.db
        .update(reminder)
        .set({
          title: input.title,
          remindAt: new Date(input.remindAt)
        })
        .where(and(eq(reminder.id, input.id), eq(reminder.userId, context.session.user.id)))
        .returning({ id: reminder.id })

      if (updated.length === 0) {
        throw errors.NOT_FOUND()
      }

      return { id: input.id }
    }),

  deleteEntry: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(deleteRecordSchema)
    .handler(async ({ input, context, errors }): Promise<{ id: string }> => {
      const deleted: Array<{ id: string }> = await context.db
        .delete(journalEntry)
        .where(and(eq(journalEntry.id, input.id), eq(journalEntry.userId, context.session.user.id)))
        .returning({ id: journalEntry.id })

      if (deleted.length === 0) {
        throw errors.NOT_FOUND()
      }

      return { id: input.id }
    }),

  deleteTodo: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(deleteRecordSchema)
    .handler(async ({ input, context, errors }): Promise<{ id: string }> => {
      const deleted: Array<{ id: string }> = await context.db
        .delete(todo)
        .where(and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)))
        .returning({ id: todo.id })

      if (deleted.length === 0) {
        throw errors.NOT_FOUND()
      }

      return { id: input.id }
    }),

  deleteReminder: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(deleteRecordSchema)
    .handler(async ({ input, context, errors }): Promise<{ id: string }> => {
      const deleted: Array<{ id: string }> = await context.db
        .delete(reminder)
        .where(and(eq(reminder.id, input.id), eq(reminder.userId, context.session.user.id)))
        .returning({ id: reminder.id })

      if (deleted.length === 0) {
        throw errors.NOT_FOUND()
      }

      return { id: input.id }
    }),

  setTodoDone: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(recordDoneSchema)
    .handler(async ({ input, context, errors }): Promise<RecordDoneOutput> => {
      const updated: Array<{ id: string }> = await context.db
        .update(todo)
        .set({ status: input.done ? 'done' : 'open' })
        .where(and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)))
        .returning({ id: todo.id })

      if (updated.length === 0) {
        throw errors.NOT_FOUND()
      }

      return input
    }),

  setReminderDone: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(recordDoneSchema)
    .handler(async ({ input, context, errors }): Promise<RecordDoneOutput> => {
      const updated: Array<{ id: string }> = await context.db
        .update(reminder)
        .set({ status: input.done ? 'dismissed' : 'pending' })
        .where(and(eq(reminder.id, input.id), eq(reminder.userId, context.session.user.id)))
        .returning({ id: reminder.id })

      if (updated.length === 0) {
        throw errors.NOT_FOUND()
      }

      return input
    })
}
