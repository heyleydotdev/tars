import type OpenAI from 'openai'

import type {
  MeasureReferenceItemOutput,
  MeasureReferenceListOutput,
  MeasureResultOutput
} from '@tars/core/schemas/measure'
import type { MeasurePromptObjects, SamDetection } from '@tars/core/utils/measure'
import { META_SAM_MODEL } from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { createMeasureReferenceSchema, measureRequestSchema } from '@tars/core/schemas/measure'
import { buildMeasureResult, parseSamBoxes, pickLargestDetection } from '@tars/core/utils/measure'
import { measureReference } from '@tars/db/schema'
import { and, asc, eq, isNull, or } from '@tars/db/sql'

import { openAiMiddleware, protectedProcedure } from '../context'
import { BadRequestError, GatewayError, InternalServerError } from '../errors'
import { measureHistoryRouter } from './measure-history'

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

async function segmentPrompts(
  openAi: OpenAI,
  image: string,
  prompts: Array<string>
): Promise<Array<MeasurePromptObjects>> {
  const results = new Array<MeasurePromptObjects>(prompts.length)
  const concurrency = Math.min(2, prompts.length)
  let next = 0

  async function worker(): Promise<void> {
    while (next < prompts.length) {
      const index = next
      const prompt = prompts[index]

      next += 1

      if (prompt === undefined) return

      results[index] = {
        prompt,
        objects: await segment(openAi, image, prompt)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  return results
}

export const measureRouter = {
  history: measureHistoryRouter,

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
    .errors({ INTERNAL_SERVER_ERROR: InternalServerError })
    .input(createMeasureReferenceSchema)
    .handler(async ({ input, context, errors }): Promise<MeasureReferenceItemOutput> => {
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
        throw errors.INTERNAL_SERVER_ERROR({
          message: ERRORS.referenceSaveFailed
        })
      }

      return reference
    }),

  run: protectedProcedure
    .errors({ BAD_GATEWAY: GatewayError, BAD_REQUEST: BadRequestError })
    .input(measureRequestSchema)
    .use(openAiMiddleware)
    .handler(async ({ input, context, errors }): Promise<MeasureResultOutput> => {
      const [reference] = await context.db
        .select(referenceColumns)
        .from(measureReference)
        .where(
          and(eq(measureReference.id, input.referenceId), visibleReference(context.session.user.id))
        )
        .limit(1)

      if (!reference) {
        throw errors.BAD_REQUEST({ message: ERRORS.referenceMissing })
      }

      const [referenceDetections, promptObjects] = await Promise.all([
        segment(context.openAi, input.image, reference.prompt),
        segmentPrompts(context.openAi, input.image, input.prompts)
      ]).catch(() => {
        throw errors.BAD_GATEWAY({ message: ERRORS.segmentationFailed })
      })

      const referenceBox = pickLargestDetection(referenceDetections)

      if (!referenceBox) {
        throw errors.BAD_REQUEST({ message: ERRORS.referenceNotFound(reference.label) })
      }

      if (promptObjects.every((group) => group.objects.length === 0)) {
        throw errors.BAD_REQUEST({ message: ERRORS.objectNotFound(input.prompts.join(', ')) })
      }

      try {
        return buildMeasureResult({
          reference,
          referenceBox,
          referenceMatches: referenceDetections.length,
          prompts: input.prompts,
          promptObjects
        })
      } catch {
        throw errors.BAD_REQUEST({ message: ERRORS.measurementFailed })
      }
    })
}
