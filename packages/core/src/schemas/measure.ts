import * as z from 'zod'

import { ERRORS } from '../errors'

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

export const measureRequestSchema = z.object({
  image: z
    .string()
    .startsWith('data:image/', ERRORS.imageTypeInvalid)
    .max(8_000_000, ERRORS.imageTooLarge),
  referenceId: z.string().min(1, ERRORS.referenceRequired),
  prompt: z.string().trim().min(1, ERRORS.objectRequired).max(80, ERRORS.objectTooLong)
})

export const measureFormSchema = z.object({
  referenceId: z.string().min(1, ERRORS.referenceRequired),
  prompt: z.string().trim().min(1, ERRORS.objectRequired).max(80, ERRORS.objectTooLong)
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
  objects: z.array(measureObjectSchema)
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
