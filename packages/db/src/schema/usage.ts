import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { user } from './auth'

const createdAt = integer('created_at', { mode: 'timestamp_ms' })
  .notNull()
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)

export const usageEvent = sqliteTable(
  'usage_event',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    feature: text('feature').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    costMicros: integer('cost_micros').notNull(),
    createdAt
  },
  (table) => [index('usage_event_userId_idx').on(table.userId, table.createdAt)]
)

export type UsageEventSelect = typeof usageEvent.$inferSelect
export type UsageEventInsert = typeof usageEvent.$inferInsert
