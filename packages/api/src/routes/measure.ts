import type OpenAI from 'openai'
import { ORPCError } from '@orpc/client'

import type {
  MeasureReferenceItemOutput,
  MeasureReferenceListOutput,
  MeasureResultOutput
} from '@tars/core/schemas/measure'
import type { SamDetection } from '@tars/core/utils/measure'
import { META_SAM_MODEL } from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { createMeasureReferenceSchema, measureRequestSchema } from '@tars/core/schemas/measure'
import { buildMeasureResult, parseSamBoxes, pickLargestDetection } from '@tars/core/utils/measure'
import { measureReference } from '@tars/db/schema'
import { and, asc, eq, isNull, or } from '@tars/db/sql'

import { openAiMiddleware, protectedProcedure } from '../context'

const referenceColumns = {
  id: measureReference.id,
  label: measureReference.label,
  prompt: measureReference.prompt,
  widthMm: measureReference.widthMm,
  heightMm: measureReference.heightMm
}

function visibleReference(userId: string) {
  return or(isNull(measureReference.userId), eq(measureReference.userId, userId))
}

async function segment(
  openAi: OpenAI,
  image: string,
  prompt: string
): Promise<Array<SamDetection>> {
  const response = await openAi.responses.create({
    model: META_SAM_MODEL,
    input: [
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: image, detail: 'auto' }
        ]
      }
    ],
    metadata: { mask_encoding: 'one_bit' }
  })

  return parseSamBoxes(response.output_text)
}

export const measureRouter = {
  references: protectedProcedure.handler(
    async ({ context }): Promise<MeasureReferenceListOutput> => {
      const rows = await context.db
        .select(referenceColumns)
        .from(measureReference)
        .where(visibleReference(context.session.user.id))
        .orderBy(asc(measureReference.sortOrder), asc(measureReference.label))

      return { items: rows }
    }
  ),

  createReference: protectedProcedure
    .input(createMeasureReferenceSchema)
    .handler(async ({ input, context }): Promise<MeasureReferenceItemOutput> => {
      const [reference] = await context.db
        .insert(measureReference)
        .values({
          id: crypto.randomUUID(),
          userId: context.session.user.id,
          label: input.label,
          prompt: input.prompt,
          widthMm: input.widthMm,
          heightMm: input.heightMm,
          sortOrder: 1_000
        })
        .returning(referenceColumns)

      if (!reference) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: ERRORS.referenceSaveFailed
        })
      }

      return reference
    }),

  run: protectedProcedure
    .input(measureRequestSchema)
    .use(openAiMiddleware)
    .handler(async ({ input, context }): Promise<MeasureResultOutput> => {
      const [reference] = await context.db
        .select(referenceColumns)
        .from(measureReference)
        .where(
          and(eq(measureReference.id, input.referenceId), visibleReference(context.session.user.id))
        )
        .limit(1)

      if (!reference) {
        throw new ORPCError('BAD_REQUEST', {
          message: ERRORS.referenceMissing
        })
      }

      const [referenceDetections, objectDetections] = await Promise.all([
        segment(context.openAi, input.image, reference.prompt),
        segment(context.openAi, input.image, input.prompt)
      ]).catch(() => {
        throw new ORPCError('BAD_GATEWAY', {
          message: ERRORS.segmentationFailed
        })
      })

      const referenceBox = pickLargestDetection(referenceDetections)

      if (!referenceBox) {
        throw new ORPCError('BAD_REQUEST', {
          message: ERRORS.referenceNotFound(reference.label)
        })
      }

      if (objectDetections.length === 0) {
        throw new ORPCError('BAD_REQUEST', {
          message: ERRORS.objectNotFound(input.prompt)
        })
      }

      try {
        return buildMeasureResult({
          reference,
          referenceBox,
          referenceMatches: referenceDetections.length,
          objectPrompt: input.prompt,
          objects: objectDetections
        })
      } catch {
        throw new ORPCError('BAD_REQUEST', {
          message: ERRORS.measurementFailed
        })
      }
    })
}
