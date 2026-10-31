import * as z from 'zod'

import { MEASURE_PROMPT_LIMIT, MEASURE_UNITS } from '../constants'
import { ERRORS } from '../errors'

export const measureUnitSchema = z.enum(MEASURE_UNITS)

const measurePromptSchema = z
  .string()
  .trim()
  .min(1, ERRORS.objectRequired)
  .max(80, ERRORS.objectTooLong)

export const measureReferenceItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  prompt: z.string().min(1),
  widthMm: z.number().positive(),
  heightMm: z.number().positive()
})

export const measureReferenceListSchema = z.object({
  items: z.array(measureReferenceItemSchema)
})

export const createMeasureReferenceSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, ERRORS.referenceLabelRequired)
    .max(40, ERRORS.referenceLabelTooLong),
  prompt: z
    .string()
    .trim()
    .min(1, ERRORS.referencePromptRequired)
    .max(80, ERRORS.referencePromptTooLong),
  widthMm: z
    .number({ error: ERRORS.widthRequired })
    .positive(ERRORS.widthPositive)
    .max(5_000, ERRORS.widthTooLarge),
  heightMm: z
    .number({ error: ERRORS.heightRequired })
    .positive(ERRORS.heightPositive)
    .max(5_000, ERRORS.heightTooLarge)
})

export const measureRequestSchema = z
  .union([
    z.object({
      image: z
        .string()
        .startsWith('data:image/', ERRORS.imageTypeInvalid)
        .max(8_000_000, ERRORS.imageTooLarge),
      referenceId: z.string().min(1, ERRORS.referenceRequired),
      prompt: measurePromptSchema
    }),
    z.object({
      image: z
        .string()
        .startsWith('data:image/', ERRORS.imageTypeInvalid)
        .max(8_000_000, ERRORS.imageTooLarge),
      referenceId: z.string().min(1, ERRORS.referenceRequired),
      prompts: z
        .array(measurePromptSchema)
        .min(1, ERRORS.objectRequired)
        .max(MEASURE_PROMPT_LIMIT, ERRORS.objectsTooMany)
    })
  ])
  .transform((input) => ({
    image: input.image,
    referenceId: input.referenceId,
    prompts: 'prompts' in input ? input.prompts : [input.prompt]
  }))

export const measureFormSchema = z.object({
  referenceId: z.string().min(1, ERRORS.referenceRequired),
  prompts: z
    .array(measurePromptSchema)
    .min(1, ERRORS.objectRequired)
    .max(MEASURE_PROMPT_LIMIT, ERRORS.objectsTooMany)
})

export const measureBoxSchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  width: z.number(),
  height: z.number()
})

export const measureObjectSchema = z.object({
  prompt: z.string(),
  box: measureBoxSchema,
  widthMm: z.number(),
  heightMm: z.number()
})

export const measureResultSchema = z.object({
  image: z.object({
    width: z.number().int(),
    height: z.number().int()
  }),
  scaleMmPerPx: z.number(),
  reference: measureReferenceItemSchema.extend({
    box: measureBoxSchema,
    matches: z.number().int()
  }),
  objects: z.array(measureObjectSchema),
  prompts: z.array(z.string()).default([]),
  missingPrompts: z.array(z.string()).default([])
})

export type MeasureReferenceItemInput = z.input<typeof measureReferenceItemSchema>
export type MeasureReferenceItemOutput = z.output<typeof measureReferenceItemSchema>
export type MeasureReferenceListInput = z.input<typeof measureReferenceListSchema>
export type MeasureReferenceListOutput = z.output<typeof measureReferenceListSchema>
export type CreateMeasureReferenceInput = z.input<typeof createMeasureReferenceSchema>
export type CreateMeasureReferenceOutput = z.output<typeof createMeasureReferenceSchema>
export type MeasureRequestInput = z.input<typeof measureRequestSchema>
export type MeasureRequestOutput = z.output<typeof measureRequestSchema>
export type MeasureFormInput = z.input<typeof measureFormSchema>
export type MeasureFormOutput = z.output<typeof measureFormSchema>
export type MeasureBoxInput = z.input<typeof measureBoxSchema>
export type MeasureBoxOutput = z.output<typeof measureBoxSchema>
export type MeasureObjectInput = z.input<typeof measureObjectSchema>
export type MeasureObjectOutput = z.output<typeof measureObjectSchema>
export type MeasureResultInput = z.input<typeof measureResultSchema>
export type MeasureResultOutput = z.output<typeof measureResultSchema>

export const measureHistoryItemStatusSchema = z.enum(['idle', 'done', 'error'])

export const measureHistoryItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  status: measureHistoryItemStatusSchema,
  error: z.string().nullable(),
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
  result: measureResultSchema.nullable()
})

export const measureHistorySummarySchema = z.object({
  id: z.string(),
  referenceLabel: z.string(),
  prompts: z.array(z.string()),
  unit: measureUnitSchema,
  itemCount: z.number().int(),
  measuredCount: z.number().int(),
  coverThumb: z.string(),
  createdAt: z.string()
})

export const measureHistorySaveSchema = z.object({
  referenceId: z.string().nullable(),
  referenceLabel: z.string().min(1),
  referencePrompt: z.string().min(1),
  referenceWidthMm: z.number().positive(),
  referenceHeightMm: z.number().positive(),
  prompts: z
    .array(measurePromptSchema)
    .min(1, ERRORS.objectRequired)
    .max(MEASURE_PROMPT_LIMIT, ERRORS.objectsTooMany),
  unit: measureUnitSchema,
  coverThumb: z.string().startsWith('data:image/'),
  items: z.array(measureHistoryItemSchema).min(1).max(50)
})

export const measureHistoryListSchema = z.object({
  items: z.array(measureHistorySummarySchema)
})

export const measureHistoryIdSchema = z.object({
  id: z.string().min(1)
})

export const measureHistoryUploadSchema = z.object({
  itemId: z.string().min(1),
  variant: z.enum(['full', 'thumb']),
  file: z.instanceof(Blob)
})

export const measureHistoryImageSchema = z.object({
  itemId: z.string().min(1),
  variant: z.enum(['full', 'thumb'])
})

export const measureHistoryImageOutputSchema = z.instanceof(ReadableStream)

export const measureHistoryDetailSchema = measureHistorySummarySchema.extend({
  referenceId: z.string().nullable(),
  referencePrompt: z.string(),
  referenceWidthMm: z.number(),
  referenceHeightMm: z.number(),
  items: z.array(measureHistoryItemSchema)
})

export type MeasureHistoryItemInput = z.input<typeof measureHistoryItemSchema>
export type MeasureHistoryItemOutput = z.output<typeof measureHistoryItemSchema>
export type MeasureHistorySummaryInput = z.input<typeof measureHistorySummarySchema>
export type MeasureHistorySummaryOutput = z.output<typeof measureHistorySummarySchema>
export type MeasureHistorySaveInput = z.input<typeof measureHistorySaveSchema>
export type MeasureHistorySaveOutput = z.output<typeof measureHistorySaveSchema>
export type MeasureHistoryListInput = z.input<typeof measureHistoryListSchema>
export type MeasureHistoryListOutput = z.output<typeof measureHistoryListSchema>
export type MeasureHistoryIdInput = z.input<typeof measureHistoryIdSchema>
export type MeasureHistoryIdOutput = z.output<typeof measureHistoryIdSchema>
export type MeasureHistoryUploadInput = z.input<typeof measureHistoryUploadSchema>
export type MeasureHistoryUploadOutput = z.output<typeof measureHistoryUploadSchema>
export type MeasureHistoryImageInput = z.input<typeof measureHistoryImageSchema>
export type MeasureHistoryImageOutput = z.output<typeof measureHistoryImageSchema>
export type MeasureHistoryImageResponse = z.output<typeof measureHistoryImageOutputSchema>
export type MeasureHistoryDetailInput = z.input<typeof measureHistoryDetailSchema>
export type MeasureHistoryDetailOutput = z.output<typeof measureHistoryDetailSchema>
