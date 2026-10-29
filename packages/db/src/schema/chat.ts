import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { user } from './auth'

const createdAt = integer('created_at', { mode: 'timestamp_ms' })
  .notNull()
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)

export const chat = sqliteTable(
  'chat',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title'),
    createdAt,
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
  },
  (table) => [index('chat_userId_idx').on(table.userId)]
)

export const chatMessage = sqliteTable(
  'chat_message',
  {
    id: text('id').primaryKey(),
    chatId: text('chat_id')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull().default(''),
    status: text('status', {
      enum: ['pending', 'thinking', 'completed', 'error']
    })
      .notNull()
      .default('completed'),
    createdAt
  },
  (table) => [index('chat_message_chatId_idx').on(table.chatId)]
)

export const chatThinking = sqliteTable(
  'chat_thinking',
  {
    id: text('id').primaryKey(),
    messageId: text('message_id')
      .notNull()
      .references(() => chatMessage.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    kind: text('kind', {
      enum: ['reasoning', 'tool_call', 'tool_result', 'observation']
    }).notNull(),
    content: text('content').notNull().default(''),
    createdAt
  },
  (table) => [index('chat_thinking_messageId_idx').on(table.messageId)]
)

export const chatRelations = relations(chat, ({ many }) => ({
  messages: many(chatMessage)
}))

export const chatMessageRelations = relations(chatMessage, ({ one, many }) => ({
  chat: one(chat, { fields: [chatMessage.chatId], references: [chat.id] }),
  thinking: many(chatThinking)
}))

export const chatThinkingRelations = relations(chatThinking, ({ one }) => ({
  message: one(chatMessage, {
    fields: [chatThinking.messageId],
    references: [chatMessage.id]
  })
}))

export type ChatInsert = typeof chat.$inferInsert
export type ChatSelect = typeof chat.$inferSelect
export type ChatMessageInsert = typeof chatMessage.$inferInsert
export type ChatMessageSelect = typeof chatMessage.$inferSelect
export type ChatThinkingInsert = typeof chatThinking.$inferInsert
export type ChatThinkingSelect = typeof chatThinking.$inferSelect
