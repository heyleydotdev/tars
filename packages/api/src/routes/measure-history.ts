import type { MeasureHistoryBeginOutput } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'
import { measureHistoryIdSchema, measureHistorySaveSchema } from '@tars/core/schemas/measure'
import { deleteFiles } from '@tars/core/services/files'
import { fileKey } from '@tars/core/utils/files'
import { measureRun, measureRunItem } from '@tars/db/schema'
import { and, eq } from '@tars/db/sql'

import { protectedProcedure } from '../context'
import { InternalServerError, NotFoundError } from '../errors'

function measureFileKeys(userId: string, runId: string, itemId: string) {
  return {
    imageKey: fileKey('measure', userId, runId, `${itemId}.jpg`),
    thumbKey: fileKey('measure', userId, runId, `${itemId}-thumb.jpg`)
  }
}

export const measureHistoryRouter = {
  begin: protectedProcedure
    .input(measureHistorySaveSchema)
    .handler(async ({ input, context }): Promise<MeasureHistoryBeginOutput> => {
      const userId = context.session.user.id
      const runId = crypto.randomUUID()
      const measuredCount = input.items.filter((item) => item.status === 'done').length

      await context.db.insert(measureRun).values({
        id: runId,
        userId,
        referenceId: input.referenceId,
        referenceLabel: input.referenceLabel,
        referencePrompt: input.referencePrompt,
        referenceWidthMm: input.referenceWidthMm,
        referenceHeightMm: input.referenceHeightMm,
        prompts: input.prompts,
        unit: input.unit,
        itemCount: input.items.length,
        measuredCount,
        coverThumb: input.coverThumb,
        status: 'draft'
      })

      await context.db.insert(measureRunItem).values(
        input.items.map((item, index) => ({
          id: item.id,
          runId,
          name: item.name,
          sortOrder: index,
          status: item.status,
          error: item.error,
          imageWidth: item.imageWidth,
          imageHeight: item.imageHeight,
          result: item.result,
          ...measureFileKeys(userId, runId, item.id)
        }))
      )

      return {
        runId,
        items: input.items.map((item) => ({
          itemId: item.id,
          ...measureFileKeys(userId, runId, item.id)
        }))
      }
    }),

  complete: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(measureHistoryIdSchema)
    .handler(async ({ input, context, errors }): Promise<void> => {
      const [run] = await context.db
        .update(measureRun)
        .set({ status: 'ready', updatedAt: new Date() })
        .where(and(eq(measureRun.id, input.id), eq(measureRun.userId, context.session.user.id)))
        .returning({ id: measureRun.id })

      if (!run) throw errors.NOT_FOUND()
    }),

  remove: protectedProcedure
    .errors({ INTERNAL_SERVER_ERROR: InternalServerError, NOT_FOUND: NotFoundError })
    .input(measureHistoryIdSchema)
    .handler(async ({ input, context, errors }): Promise<void> => {
      const [run] = await context.db
        .select({ id: measureRun.id })
        .from(measureRun)
        .where(and(eq(measureRun.id, input.id), eq(measureRun.userId, context.session.user.id)))
        .limit(1)

      if (!run) throw errors.NOT_FOUND()

      const items = await context.db
        .select({ imageKey: measureRunItem.imageKey, thumbKey: measureRunItem.thumbKey })
        .from(measureRunItem)
        .where(eq(measureRunItem.runId, input.id))
      const keys = items.flatMap((item) => [item.imageKey, item.thumbKey])

      if (keys.length > 0) {
        try {
          await deleteFiles(context.files, keys)
        } catch {
          throw errors.INTERNAL_SERVER_ERROR({
            message: ERRORS.historyDeleteFailed
          })
        }
      }

      await context.db
        .delete(measureRun)
        .where(and(eq(measureRun.id, input.id), eq(measureRun.userId, context.session.user.id)))
    })
}
