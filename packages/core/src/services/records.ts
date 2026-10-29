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

import type { DeskResultOutput, SavedRecordOutput } from '../schemas/chat'
import { parseDate } from '../utils/format'

type TodoRecord = Pick<TodoSelect, 'id' | 'messageId' | 'title' | 'dueAt' | 'priority'>

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

function savedTodo(record: TodoRecord): SavedRecordOutput {
  return {
    type: 'todo',
    id: record.id,
    title: record.title,
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

export async function saveDeskRecords(
  db: Database,
  userId: string,
  messageId: string,
  result: DeskResultOutput
): Promise<Array<SavedRecordOutput>> {
  const todos = result.todos.map(
    (record) =>
      ({
        id: crypto.randomUUID(),
        userId,
        messageId,
        title: record.title,
        notes: record.notes,
        dueAt: parseDate(record.dueAt),
        priority: record.priority
      }) satisfies TodoInsert
  )

  const reminders = result.reminders.flatMap((record) => {
    const remindAt = parseDate(record.remindAt)

    if (!remindAt) return []

    return [
      {
        id: crypto.randomUUID(),
        userId,
        messageId,
        title: record.title,
        remindAt,
        notes: record.notes
      } satisfies ReminderInsert
    ]
  })

  const expenses = result.expenses.flatMap((record) => {
    if (!Number.isFinite(record.amount)) return []

    return [
      {
        id: crypto.randomUUID(),
        userId,
        messageId,
        description: record.description,
        amountCents: Math.round(record.amount * 100),
        currency: record.currency || 'USD',
        category: record.category,
        occurredAt: parseDate(record.occurredAt)
      } satisfies ExpenseInsert
    ]
  })

  const journals = result.journals.map(
    (record) =>
      ({
        id: crypto.randomUUID(),
        userId,
        messageId,
        title: record.title,
        content: record.content,
        mood: record.mood,
        tags: JSON.stringify(record.tags),
        occurredAt: parseDate(record.occurredAt)
      }) satisfies JournalEntryInsert
  )

  const statements = [
    todos.length > 0 ? db.insert(todo).values(todos) : null,
    reminders.length > 0 ? db.insert(reminder).values(reminders) : null,
    expenses.length > 0 ? db.insert(expense).values(expenses) : null,
    journals.length > 0 ? db.insert(journalEntry).values(journals) : null
  ].filter((statement) => statement !== null)
  const [first, ...rest] = statements

  if (first) {
    await db.batch([first, ...rest])
  }

  return [
    ...todos.map(savedTodo),
    ...reminders.map(savedReminder),
    ...expenses.map(savedExpense),
    ...journals.map(savedJournal)
  ]
}
