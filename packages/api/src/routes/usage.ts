import type { UsageSummaryOutput } from '@tars/core/schemas/usage'
import { usageEvent } from '@tars/db/schema'
import { desc, eq, sql } from '@tars/db/sql'

import { protectedProcedure } from '../context'

export const usageRouter = {
  summary: protectedProcedure.handler(async ({ context }): Promise<UsageSummaryOutput> => {
    const userId = context.session.user.id
    const [totals] = await context.db
      .select({
        spentMicros: sql<number>`coalesce(sum(${usageEvent.costMicros}), 0)`,
        calls: sql<number>`count(*)`,
        inputTokens: sql<number>`coalesce(sum(${usageEvent.inputTokens}), 0)`,
        outputTokens: sql<number>`coalesce(sum(${usageEvent.outputTokens}), 0)`
      })
      .from(usageEvent)
      .where(eq(usageEvent.userId, userId))

    const models = await context.db
      .select({
        model: usageEvent.model,
        calls: sql<number>`count(*)`,
        costMicros: sql<number>`coalesce(sum(${usageEvent.costMicros}), 0)`
      })
      .from(usageEvent)
      .where(eq(usageEvent.userId, userId))
      .groupBy(usageEvent.model)
      .orderBy(desc(sql`sum(${usageEvent.costMicros})`))

    const events = await context.db
      .select()
      .from(usageEvent)
      .where(eq(usageEvent.userId, userId))
      .orderBy(desc(usageEvent.createdAt))
      .limit(50)

    const spentMicros = Number(totals?.spentMicros ?? 0)

    return {
      limitMicros: context.usageLimitMicros,
      spentMicros,
      remainingMicros: Math.max(0, context.usageLimitMicros - spentMicros),
      calls: Number(totals?.calls ?? 0),
      inputTokens: Number(totals?.inputTokens ?? 0),
      outputTokens: Number(totals?.outputTokens ?? 0),
      models: models.map((row) => ({
        model: row.model,
        calls: Number(row.calls),
        costMicros: Number(row.costMicros)
      })),
      events: events.map((row) => ({
        id: row.id,
        feature: row.feature,
        model: row.model,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        costMicros: row.costMicros,
        createdAt: row.createdAt.toISOString()
      }))
    }
  })
}
