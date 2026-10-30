import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { user } from './auth'
import { chatMessage } from './chat'

const createdAt = integer('created_at', { mode: 'timestamp_ms' })
  .notNull()
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)

export const todo = sqliteTable(
  'todo',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    messageId: text('message_id')
      .notNull()
      .references(() => chatMessage.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    notes: text('notes'),
    dueAt: integer('due_at', { mode: 'timestamp_ms' }),
    priority: text('priority', { enum: ['low', 'medium', 'high'] }),
    status: text('status', { enum: ['open', 'done'] })
      .notNull()
      .default('open'),
    createdAt
  },
  (table) => [
    index('todo_userId_idx').on(table.userId),
    index('todo_messageId_idx').on(table.messageId)
  ]
)

export const reminder = sqliteTable(
  'reminder',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    messageId: text('message_id')
      .notNull()
      .references(() => chatMessage.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    remindAt: integer('remind_at', { mode: 'timestamp_ms' }).notNull(),
    notes: text('notes'),
    status: text('status', { enum: ['pending', 'sent', 'dismissed'] })
      .notNull()
      .default('pending'),
    createdAt
  },
  (table) => [
    index('reminder_userId_idx').on(table.userId),
    index('reminder_messageId_idx').on(table.messageId)
  ]
)

export const expense = sqliteTable(
  'expense',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    messageId: text('message_id')
      .notNull()
      .references(() => chatMessage.id, { onDelete: 'cascade' }),
    title: text('title'),
    description: text('description').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('USD'),
    category: text('category'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt
  },
  (table) => [
    index('expense_userId_idx').on(table.userId),
    index('expense_messageId_idx').on(table.messageId)
  ]
)

export const journalEntry = sqliteTable(
  'journal_entry',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    messageId: text('message_id')
      .notNull()
      .references(() => chatMessage.id, { onDelete: 'cascade' }),
    title: text('title'),
    content: text('content').notNull(),
    mood: text('mood'),
    tags: text('tags').notNull().default('[]'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt
  },
  (table) => [
    index('journal_entry_userId_idx').on(table.userId),
    index('journal_entry_messageId_idx').on(table.messageId)
  ]
)

export const todoRelations = relations(todo, ({ one }) => ({
  message: one(chatMessage, { fields: [todo.messageId], references: [chatMessage.id] })
}))

export const reminderRelations = relations(reminder, ({ one }) => ({
  message: one(chatMessage, { fields: [reminder.messageId], references: [chatMessage.id] })
}))

export const expenseRelations = relations(expense, ({ one }) => ({
  message: one(chatMessage, { fields: [expense.messageId], references: [chatMessage.id] })
}))

export const journalEntryRelations = relations(journalEntry, ({ one }) => ({
  message: one(chatMessage, {
    fields: [journalEntry.messageId],
    references: [chatMessage.id]
  })
}))

export type TodoInsert = typeof todo.$inferInsert
export type TodoSelect = typeof todo.$inferSelect
export type ReminderInsert = typeof reminder.$inferInsert
export type ReminderSelect = typeof reminder.$inferSelect
export type ExpenseInsert = typeof expense.$inferInsert
export type ExpenseSelect = typeof expense.$inferSelect
export type JournalEntryInsert = typeof journalEntry.$inferInsert
export type JournalEntrySelect = typeof journalEntry.$inferSelect
