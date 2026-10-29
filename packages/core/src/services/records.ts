import type { Database } from '@tars/db/client'
import type {
  ExpenseInsert,
  ExpenseSelect,
  JournalEntryInsert,
  JournalEntrySelect,
  ReminderInsert,
  ReminderSelect,
  TodoInsert,
  TodoSelect
} from '@tars/db/schema'
import { expense, journalEntry, reminder, todo } from '@tars/db/schema'
import { and, eq, inArray } from '@tars/db/sql'

import type {
  DeskContextRecord,
  DeskResultOutput,
  ExpenseRecordOutput,
  JournalRecordOutput,
  ReminderRecordOutput,
  SavedRecordOutput,
  TodoRecordOutput
} from '../schemas/chat'
import { formatZonedIso, parseDate } from '../utils/format'

type TodoRecord = Pick<TodoSelect, 'id' | 'messageId' | 'title' | 'status' | 'dueAt' | 'priority'>

type ReminderRecord = Pick<ReminderSelect, 'id' | 'messageId' | 'title' | 'remindAt'>

type ExpenseRecord = Pick<
  ExpenseSelect,
  'id' | 'messageId' | 'description' | 'amountCents' | 'currency' | 'category'
>

type JournalRecord = Pick<JournalEntrySelect, 'id' | 'messageId' | 'title' | 'content' | 'mood'>

type RecordTables = {
  todos: Array<TodoRecord>
  reminders: Array<ReminderRecord>
  expenses: Array<ExpenseRecord>
  journals: Array<JournalRecord>
}

type RecordTable = typeof todo | typeof reminder | typeof expense | typeof journalEntry

type RecordType = DeskResultOutput['deletions'][number]['type']

function todoValues(record: TodoRecordOutput) {
  return {
    title: record.title,
    status: record.done ? ('done' as const) : ('open' as const),
    notes: record.notes,
    dueAt: parseDate(record.dueAt),
    priority: record.priority
  }
}

function reminderValues(record: ReminderRecordOutput) {
  const remindAt = parseDate(record.remindAt)

  return remindAt ? { title: record.title, remindAt, notes: record.notes } : null
}

function expenseValues(record: ExpenseRecordOutput) {
  if (!Number.isFinite(record.amount)) return null

  return {
    description: record.description,
    amountCents: Math.round(record.amount * 100),
    currency: record.currency || 'USD',
    category: record.category,
    occurredAt: parseDate(record.occurredAt)
  }
}

function journalValues(record: JournalRecordOutput) {
  return {
    title: record.title,
    content: record.content,
    mood: record.mood,
    tags: JSON.stringify(record.tags),
    occurredAt: parseDate(record.occurredAt)
  }
}

function savedTodo(record: TodoRecord): SavedRecordOutput {
  return {
    type: 'todo',
    id: record.id,
    title: record.title,
    done: record.status === 'done',
    dueAt: record.dueAt?.toISOString() ?? null,
    priority: record.priority
  }
}

function savedReminder(record: ReminderRecord): SavedRecordOutput {
  return {
    type: 'reminder',
    id: record.id,
    title: record.title,
    remindAt: record.remindAt.toISOString()
  }
}

function savedExpense(record: ExpenseRecord): SavedRecordOutput {
  return {
    type: 'expense',
    id: record.id,
    description: record.description,
    amountCents: record.amountCents,
    currency: record.currency,
    category: record.category
  }
}

function savedJournal(record: JournalRecord): SavedRecordOutput {
  return {
    type: 'journal',
    id: record.id,
    title: record.title,
    content: record.content,
    mood: record.mood
  }
}

function splitRecords<T extends { id: string | null }>(
  records: Array<T>,
  type: RecordType,
  deleted: Set<string>
): { created: Array<T>; edited: Array<T & { id: string }> } {
  const created: Array<T> = []
  const edited: Array<T & { id: string }> = []
  const seen = new Set<string>()

  for (const record of records) {
    if (record.id === null) {
      created.push(record)
    } else if (!deleted.has(`${type}:${record.id}`) && !seen.has(record.id)) {
      seen.add(record.id)
      edited.push(record as T & { id: string })
    }
  }

  return { created, edited }
}

async function loadOwnedIds(
  db: Database,
  userId: string,
  ids: Array<string>,
  table: RecordTable
): Promise<Set<string>> {
  if (ids.length === 0) return new Set()

  const rows = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.userId, userId), inArray(table.id, ids)))

  return new Set(rows.map((row) => row.id))
}

export function groupRecordsByMessage(tables: RecordTables): Map<string, Array<SavedRecordOutput>> {
  const recordsByMessage = new Map<string, Array<SavedRecordOutput>>()

  const add = (messageId: string, record: SavedRecordOutput): void => {
    const records = recordsByMessage.get(messageId)

    if (records) {
      records.push(record)
    } else {
      recordsByMessage.set(messageId, [record])
    }
  }

  for (const record of tables.todos) {
    add(record.messageId, savedTodo(record))
  }

  for (const record of tables.reminders) {
    add(record.messageId, savedReminder(record))
  }

  for (const record of tables.expenses) {
    add(record.messageId, savedExpense(record))
  }

  for (const record of tables.journals) {
    add(record.messageId, savedJournal(record))
  }

  return recordsByMessage
}

export async function loadDeskContextRecords(
  db: Database,
  userId: string,
  messageIds: Array<string>,
  timezone?: string
): Promise<Array<DeskContextRecord>> {
  if (messageIds.length === 0) {
    return []
  }

  const [todos, reminders, expenses, journals] = await Promise.all([
    db
      .select()
      .from(todo)
      .where(and(eq(todo.userId, userId), inArray(todo.messageId, messageIds))),
    db
      .select()
      .from(reminder)
      .where(and(eq(reminder.userId, userId), inArray(reminder.messageId, messageIds))),
    db
      .select()
      .from(expense)
      .where(and(eq(expense.userId, userId), inArray(expense.messageId, messageIds))),
    db
      .select()
      .from(journalEntry)
      .where(and(eq(journalEntry.userId, userId), inArray(journalEntry.messageId, messageIds)))
  ])

  return [
    ...todos.map((record): DeskContextRecord => ({
      type: 'todo',
      id: record.id,
      title: record.title,
      done: record.status === 'done',
      notes: record.notes,
      dueAt: record.dueAt?.toISOString() ?? null,
      priority: record.priority
    })),
    ...reminders.map((record): DeskContextRecord => ({
      type: 'reminder',
      id: record.id,
      title: record.title,
      remindAt: record.remindAt.toISOString(),
      notes: record.notes
    })),
    ...expenses.map((record): DeskContextRecord => ({
      type: 'expense',
      id: record.id,
      description: record.description,
      amount: record.amountCents / 100,
      currency: record.currency,
      category: record.category,
      occurredAt: record.occurredAt?.toISOString() ?? null,
      savedAt: formatZonedIso(record.createdAt, timezone).value,
      minutesAgo: Math.max(0, Math.round((Date.now() - record.createdAt.getTime()) / 60_000))
    })),
    ...journals.map((record): DeskContextRecord => ({
      type: 'journal',
      id: record.id,
      title: record.title,
      content: record.content,
      mood: record.mood,
      tags: JSON.parse(record.tags) as Array<string>,
      occurredAt: record.occurredAt?.toISOString() ?? null
    }))
  ]
}

export async function saveDeskRecords(
  db: Database,
  userId: string,
  messageId: string,
  result: DeskResultOutput
): Promise<Array<SavedRecordOutput>> {
  const deleted = new Set(result.deletions.map(({ type, id }) => `${type}:${id}`))
  const todoRecords = splitRecords(result.todos, 'todo', deleted)
  const reminderRecords = splitRecords(result.reminders, 'reminder', deleted)
  const expenseRecords = splitRecords(result.expenses, 'expense', deleted)
  const journalRecords = splitRecords(result.journals, 'journal', deleted)

  const todos = todoRecords.created.map(
    (record) =>
      ({
        id: crypto.randomUUID(),
        userId,
        messageId,
        ...todoValues(record)
      }) satisfies TodoInsert
  )

  const reminders = reminderRecords.created.flatMap((record) => {
    const values = reminderValues(record)

    return values
      ? [
          {
            id: crypto.randomUUID(),
            userId,
            messageId,
            ...values
          } satisfies ReminderInsert
        ]
      : []
  })

  const expenses = expenseRecords.created.flatMap((record) => {
    const values = expenseValues(record)

    return values
      ? [
          {
            id: crypto.randomUUID(),
            userId,
            messageId,
            ...values
          } satisfies ExpenseInsert
        ]
      : []
  })

  const journals = journalRecords.created.map(
    (record) =>
      ({
        id: crypto.randomUUID(),
        userId,
        messageId,
        ...journalValues(record)
      }) satisfies JournalEntryInsert
  )

  const todoDeletionIds = result.deletions
    .filter((deletion) => deletion.type === 'todo')
    .map((deletion) => deletion.id)
  const reminderDeletionIds = result.deletions
    .filter((deletion) => deletion.type === 'reminder')
    .map((deletion) => deletion.id)
  const expenseDeletionIds = result.deletions
    .filter((deletion) => deletion.type === 'expense')
    .map((deletion) => deletion.id)
  const journalDeletionIds = result.deletions
    .filter((deletion) => deletion.type === 'journal')
    .map((deletion) => deletion.id)

  const [ownedTodoIds, ownedReminderIds, ownedExpenseIds, ownedJournalIds] = await Promise.all([
    loadOwnedIds(
      db,
      userId,
      [...todoRecords.edited.map((record) => record.id), ...todoDeletionIds],
      todo
    ),
    loadOwnedIds(
      db,
      userId,
      [...reminderRecords.edited.map((record) => record.id), ...reminderDeletionIds],
      reminder
    ),
    loadOwnedIds(
      db,
      userId,
      [...expenseRecords.edited.map((record) => record.id), ...expenseDeletionIds],
      expense
    ),
    loadOwnedIds(
      db,
      userId,
      [...journalRecords.edited.map((record) => record.id), ...journalDeletionIds],
      journalEntry
    )
  ])

  const todoUpdates = todoRecords.edited
    .filter((record) => ownedTodoIds.has(record.id))
    .map((record) => {
      const values = { messageId, ...todoValues(record) }

      return {
        record: { id: record.id, ...values },
        statement: db
          .update(todo)
          .set(values)
          .where(and(eq(todo.id, record.id), eq(todo.userId, userId)))
      }
    })

  const reminderUpdates = reminderRecords.edited
    .filter((record) => ownedReminderIds.has(record.id))
    .flatMap((record) => {
      const values = reminderValues(record)

      if (!values) return []

      const update = { messageId, ...values }

      return [
        {
          record: { id: record.id, ...update },
          statement: db
            .update(reminder)
            .set(update)
            .where(and(eq(reminder.id, record.id), eq(reminder.userId, userId)))
        }
      ]
    })

  const expenseUpdates = expenseRecords.edited
    .filter((record) => ownedExpenseIds.has(record.id))
    .flatMap((record) => {
      const values = expenseValues(record)

      if (!values) return []

      const update = { messageId, ...values }

      return [
        {
          record: { id: record.id, ...update },
          statement: db
            .update(expense)
            .set(update)
            .where(and(eq(expense.id, record.id), eq(expense.userId, userId)))
        }
      ]
    })

  const journalUpdates = journalRecords.edited
    .filter((record) => ownedJournalIds.has(record.id))
    .map((record) => {
      const values = { messageId, ...journalValues(record) }

      return {
        record: { id: record.id, ...values },
        statement: db
          .update(journalEntry)
          .set(values)
          .where(and(eq(journalEntry.id, record.id), eq(journalEntry.userId, userId)))
      }
    })

  const insertStatements = [
    todos.length > 0 ? db.insert(todo).values(todos) : null,
    reminders.length > 0 ? db.insert(reminder).values(reminders) : null,
    expenses.length > 0 ? db.insert(expense).values(expenses) : null,
    journals.length > 0 ? db.insert(journalEntry).values(journals) : null
  ].filter((statement) => statement !== null)
  const [firstInsert, ...restInserts] = insertStatements

  if (firstInsert) {
    await db.batch([firstInsert, ...restInserts])
  }

  const deletionIds = (type: RecordType, owned: Set<string>): Array<string> =>
    result.deletions
      .filter((deletion) => deletion.type === type && owned.has(deletion.id))
      .map((deletion) => deletion.id)

  const todoChanges = [
    ...todoUpdates.map((update) => update.statement),
    ...deletionIds('todo', ownedTodoIds).map((id) =>
      db.delete(todo).where(and(eq(todo.id, id), eq(todo.userId, userId)))
    )
  ]
  const [firstTodoChange, ...restTodoChanges] = todoChanges

  if (firstTodoChange) {
    await db.batch([firstTodoChange, ...restTodoChanges])
  }

  const reminderChanges = [
    ...reminderUpdates.map((update) => update.statement),
    ...deletionIds('reminder', ownedReminderIds).map((id) =>
      db.delete(reminder).where(and(eq(reminder.id, id), eq(reminder.userId, userId)))
    )
  ]
  const [firstReminderChange, ...restReminderChanges] = reminderChanges

  if (firstReminderChange) {
    await db.batch([firstReminderChange, ...restReminderChanges])
  }

  const expenseChanges = [
    ...expenseUpdates.map((update) => update.statement),
    ...deletionIds('expense', ownedExpenseIds).map((id) =>
      db.delete(expense).where(and(eq(expense.id, id), eq(expense.userId, userId)))
    )
  ]
  const [firstExpenseChange, ...restExpenseChanges] = expenseChanges

  if (firstExpenseChange) {
    await db.batch([firstExpenseChange, ...restExpenseChanges])
  }

  const journalChanges = [
    ...journalUpdates.map((update) => update.statement),
    ...deletionIds('journal', ownedJournalIds).map((id) =>
      db.delete(journalEntry).where(and(eq(journalEntry.id, id), eq(journalEntry.userId, userId)))
    )
  ]
  const [firstJournalChange, ...restJournalChanges] = journalChanges

  if (firstJournalChange) {
    await db.batch([firstJournalChange, ...restJournalChanges])
  }

  return [
    ...todos.map(savedTodo),
    ...todoUpdates.map((update) => savedTodo(update.record)),
    ...reminders.map(savedReminder),
    ...reminderUpdates.map((update) => savedReminder(update.record)),
    ...expenses.map(savedExpense),
    ...expenseUpdates.map((update) => savedExpense(update.record)),
    ...journals.map(savedJournal),
    ...journalUpdates.map((update) => savedJournal(update.record))
  ]
}
