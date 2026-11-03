import type {
  UiFindingOutput,
  UiReviewDetailOutput,
  UiReviewListOutput,
  UiReviewSummaryOutput,
  UiReviewUploadOutput,
  UiVariantOutput
} from '@tars/core/schemas/ui-review'
import type { UiExplainOutput } from '@tars/core/schemas/ui-review-ai'
import type { Database } from '@tars/db/client'
import type { UiFindingSelect, UiReviewSelect, UiVariantSelect } from '@tars/db/schema'
import { META_IMAGE_MODEL, UI_REVIEW_VARIANT_LIMIT } from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { buildUiExplainPrompt, buildUiRedesignPrompt } from '@tars/core/prompts/ui-review'
import {
  createUiReviewSchema,
  generateUiRedesignSchema,
  uiReviewIdSchema,
  updateUiFindingSchema
} from '@tars/core/schemas/ui-review'
import { uiExplainJsonSchema, uiPromptJsonSchema } from '@tars/core/schemas/ui-review-ai'
import { signFileKey } from '@tars/core/services/files'
import { fileKey, signedFilePath } from '@tars/core/utils/files'
import { parseUiExplain, parseUiPrompt } from '@tars/core/utils/ui-review'
import { uiFinding, uiReview, uiVariant } from '@tars/db/schema'
import { and, asc, desc, eq, sql } from '@tars/db/sql'

import type { ModelInput } from '../lib/structured'
import { aiMiddleware, protectedProcedure } from '../context'
import { BadRequestError, GatewayError, NotFoundError } from '../errors'
import { runStructured } from '../lib/structured'

type ReviewContext = { db: Database; fileSecret: string }

async function loadReview(db: Database, userId: string, id: string): Promise<UiReviewSelect> {
  const [row] = await db
    .select()
    .from(uiReview)
    .where(and(eq(uiReview.id, id), eq(uiReview.userId, userId)))
    .limit(1)

  if (!row) throw new NotFoundError()

  return row
}

async function signedUrl(secret: string, key: string): Promise<string> {
  return signedFilePath(key, await signFileKey(secret, key))
}

function serializeFinding(row: UiFindingSelect): UiFindingOutput {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    severity: row.severity,
    included: Boolean(row.included)
  }
}

async function serializeVariant(
  context: ReviewContext,
  row: UiVariantSelect
): Promise<UiVariantOutput> {
  return {
    id: row.id,
    prompt: row.prompt,
    instruction: row.instruction,
    findings: row.findings,
    imageUrl: await signedUrl(context.fileSecret, row.imageKey),
    createdAt: row.createdAt.toISOString()
  }
}

function summary(
  row: UiReviewSelect,
  findingCount: number,
  variantCount: number
): UiReviewSummaryOutput {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    summary: row.summary,
    findingCount,
    variantCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

async function loadDetail(
  context: ReviewContext,
  row: UiReviewSelect
): Promise<UiReviewDetailOutput> {
  const [findings, variants] = await Promise.all([
    context.db
      .select()
      .from(uiFinding)
      .where(eq(uiFinding.reviewId, row.id))
      .orderBy(asc(uiFinding.sortOrder)),
    context.db
      .select()
      .from(uiVariant)
      .where(eq(uiVariant.reviewId, row.id))
      .orderBy(asc(uiVariant.createdAt))
  ])

  return {
    review: summary(row, findings.length, variants.length),
    screenshotUrl: await signedUrl(context.fileSecret, row.imageKey),
    findings: findings.map(serializeFinding),
    variants: await Promise.all(variants.map((variant) => serializeVariant(context, variant)))
  }
}

async function dataUrlFromObject(object: {
  body: ReadableStream
  httpMetadata?: { contentType?: string }
}): Promise<string> {
  const bytes = new Uint8Array(await new Response(object.body).arrayBuffer())
  let binary = ''

  for (const byte of bytes) binary += String.fromCharCode(byte)

  return `data:${object.httpMetadata?.contentType ?? 'image/jpeg'};base64,${btoa(binary)}`
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function imageInfo(bytes: Uint8Array): { extension: string; contentType: string } {
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return { extension: 'webp', contentType: 'image/webp' }
  }

  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return { extension: 'png', contentType: 'image/png' }
  }

  return { extension: 'jpg', contentType: 'image/jpeg' }
}

export const uiReviewRouter = {
  list: protectedProcedure.handler(async ({ context }): Promise<UiReviewListOutput> => {
    const rows = await context.db
      .select()
      .from(uiReview)
      .where(eq(uiReview.userId, context.session.user.id))
      .orderBy(desc(uiReview.updatedAt))
      .limit(50)
    const findings = await context.db
      .select({ reviewId: uiFinding.reviewId, count: sql<number>`count(*)` })
      .from(uiFinding)
      .groupBy(uiFinding.reviewId)
    const variants = await context.db
      .select({ reviewId: uiVariant.reviewId, count: sql<number>`count(*)` })
      .from(uiVariant)
      .groupBy(uiVariant.reviewId)
    const findingCounts = new Map(findings.map((row) => [row.reviewId, Number(row.count)]))
    const variantCounts = new Map(variants.map((row) => [row.reviewId, Number(row.count)]))

    return {
      items: rows.map((row) =>
        summary(row, findingCounts.get(row.id) ?? 0, variantCounts.get(row.id) ?? 0)
      )
    }
  }),

  get: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(uiReviewIdSchema)
    .handler(async ({ input, context }): Promise<UiReviewDetailOutput> => {
      const row = await loadReview(context.db, context.session.user.id, input.reviewId)

      return loadDetail(context, row)
    }),

  create: protectedProcedure
    .input(createUiReviewSchema)
    .handler(async ({ input, context }): Promise<UiReviewUploadOutput> => {
      const id = crypto.randomUUID()
      const imageKey = fileKey('ui', context.session.user.id, id, 'screenshot.jpg')

      await context.db.insert(uiReview).values({
        id,
        userId: context.session.user.id,
        title: input.title,
        imageKey
      })

      return { reviewId: id, imageKey }
    }),

  remove: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(uiReviewIdSchema)
    .handler(async ({ input, context }): Promise<void> => {
      const row = await loadReview(context.db, context.session.user.id, input.reviewId)
      const variants = await context.db
        .select({ imageKey: uiVariant.imageKey })
        .from(uiVariant)
        .where(eq(uiVariant.reviewId, row.id))

      await context.db.delete(uiReview).where(eq(uiReview.id, row.id))

      await context.files
        .delete([row.imageKey, ...variants.map((variant) => variant.imageKey)])
        .catch((error: unknown) => {
          console.error('ui review image cleanup failed', error)
        })
    }),

  updateFinding: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(updateUiFindingSchema)
    .handler(async ({ input, context }): Promise<UiReviewDetailOutput> => {
      const [row] = await context.db
        .select({ id: uiFinding.id, reviewId: uiFinding.reviewId })
        .from(uiFinding)
        .innerJoin(uiReview, eq(uiReview.id, uiFinding.reviewId))
        .where(and(eq(uiFinding.id, input.findingId), eq(uiReview.userId, context.session.user.id)))
        .limit(1)

      if (!row) throw new NotFoundError()

      await context.db
        .update(uiFinding)
        .set({ included: input.included ? 1 : 0 })
        .where(eq(uiFinding.id, row.id))
      await context.db
        .update(uiReview)
        .set({ updatedAt: new Date() })
        .where(eq(uiReview.id, row.reviewId))

      const review = await loadReview(context.db, context.session.user.id, row.reviewId)

      return loadDetail(context, review)
    }),

  explain: protectedProcedure
    .errors({ BAD_REQUEST: BadRequestError, NOT_FOUND: NotFoundError, BAD_GATEWAY: GatewayError })
    .input(uiReviewIdSchema)
    .use(aiMiddleware('ui'))
    .handler(async ({ input, context, errors }): Promise<UiReviewDetailOutput> => {
      const row = await loadReview(context.db, context.session.user.id, input.reviewId)
      const object = await context.files.get(row.imageKey)

      if (!object) throw errors.BAD_REQUEST({ message: ERRORS.uiScreenshotMissing })

      const image = await dataUrlFromObject(object)
      let explained: UiExplainOutput

      try {
        explained = await runStructured(context.openAi, {
          name: 'ui_explain',
          schema: uiExplainJsonSchema as Record<string, unknown>,
          instructions: buildUiExplainPrompt(),
          input: [
            {
              type: 'message',
              role: 'user',
              content: [
                { type: 'input_text', text: 'Review this screen.' },
                { type: 'input_image', image_url: image, detail: 'auto' }
              ]
            }
          ] satisfies ModelInput,
          parse: parseUiExplain
        })
      } catch (error) {
        console.error('ui explain failed', error)
        throw new GatewayError({ message: ERRORS.uiExplainFailed })
      }

      await context.db.delete(uiFinding).where(eq(uiFinding.reviewId, row.id))

      if (explained.findings.length > 0) {
        await context.db.insert(uiFinding).values(
          explained.findings.map((finding, index) => ({
            id: crypto.randomUUID(),
            reviewId: row.id,
            label: finding.label,
            description: finding.description,
            severity: finding.severity,
            redesignHint: finding.redesignHint,
            sortOrder: index
          }))
        )
      }

      await context.db
        .update(uiReview)
        .set({
          summary: explained.summary,
          platform: explained.platform,
          status: 'explained',
          updatedAt: new Date()
        })
        .where(eq(uiReview.id, row.id))

      return loadDetail(context, await loadReview(context.db, context.session.user.id, row.id))
    }),

  generate: protectedProcedure
    .errors({ BAD_REQUEST: BadRequestError, NOT_FOUND: NotFoundError, BAD_GATEWAY: GatewayError })
    .input(generateUiRedesignSchema)
    .use(aiMiddleware('ui'))
    .handler(async ({ input, context, errors }): Promise<UiReviewDetailOutput> => {
      const row = await loadReview(context.db, context.session.user.id, input.reviewId)
      const [countRow] = await context.db
        .select({ count: sql<number>`count(*)` })
        .from(uiVariant)
        .where(eq(uiVariant.reviewId, row.id))

      if (Number(countRow?.count ?? 0) >= UI_REVIEW_VARIANT_LIMIT) {
        throw errors.BAD_REQUEST({ message: ERRORS.uiVariantLimit })
      }

      const findings = await context.db
        .select()
        .from(uiFinding)
        .where(and(eq(uiFinding.reviewId, row.id), eq(uiFinding.included, 1)))
        .orderBy(asc(uiFinding.sortOrder))

      if (findings.length === 0) {
        throw errors.BAD_REQUEST({ message: ERRORS.uiFindingNone })
      }

      let prompt: string

      try {
        const built = await runStructured(context.openAi, {
          name: 'ui_redesign_prompt',
          schema: uiPromptJsonSchema as Record<string, unknown>,
          instructions: buildUiRedesignPrompt({
            summary: row.summary,
            platform: row.platform,
            findings: findings.map((finding) => ({
              label: finding.label,
              description: finding.description,
              severity: finding.severity,
              redesignHint: finding.redesignHint ?? finding.description
            })),
            instruction: input.instruction
          }),
          input: 'Write the image prompt.',
          parse: parseUiPrompt
        })

        prompt = built.prompt
      } catch (error) {
        console.error('ui redesign prompt failed', error)
        throw new GatewayError({ message: ERRORS.uiRedesignFailed })
      }

      let bytes: Uint8Array

      try {
        const generated = await context.openAi.images.generate({
          model: META_IMAGE_MODEL,
          prompt,
          n: 1,
          size: '1024x1024'
        })
        const encoded = generated.data?.[0]?.b64_json

        if (!encoded) throw new Error('no image data')

        bytes = decodeBase64(encoded)
      } catch (error) {
        console.error('ui redesign image failed', error)
        throw new GatewayError({ message: ERRORS.uiRedesignFailed })
      }

      const variantId = crypto.randomUUID()
      const info = imageInfo(bytes)
      const imageKey = fileKey(
        'ui',
        context.session.user.id,
        row.id,
        `${variantId}.${info.extension}`
      )

      await context.files.put(imageKey, bytes.buffer as ArrayBuffer, {
        httpMetadata: { contentType: info.contentType }
      })
      await context.db.insert(uiVariant).values({
        id: variantId,
        reviewId: row.id,
        imageKey,
        prompt,
        instruction: input.instruction,
        findings: findings.map((finding) => finding.label)
      })
      await context.db
        .update(uiReview)
        .set({ updatedAt: new Date() })
        .where(eq(uiReview.id, row.id))

      return loadDetail(context, await loadReview(context.db, context.session.user.id, row.id))
    })
}
