import * as z from 'zod'

import { ERRORS } from '../errors'

export const uiReviewStatusSchema = z.enum(['created', 'explained'])
export const uiFindingSeveritySchema = z.enum(['minor', 'moderate', 'significant'])
export const uiPlatformSchema = z.enum(['mobile', 'web', 'desktop', 'unknown'])

export const uiFindingSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  severity: uiFindingSeveritySchema,
  included: z.boolean()
})

export const uiVariantSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  instruction: z.string().nullable(),
  findings: z.array(z.string()),
  imageUrl: z.string().min(1),
  createdAt: z.string()
})

export const uiReviewSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().nullable(),
  status: uiReviewStatusSchema,
  summary: z.string().nullable(),
  findingCount: z.number().int().nonnegative(),
  variantCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const uiReviewListSchema = z.object({
  items: z.array(uiReviewSummarySchema)
})

export const uiReviewDetailSchema = z.object({
  review: uiReviewSummarySchema,
  screenshotUrl: z.string().min(1),
  findings: z.array(uiFindingSchema),
  variants: z.array(uiVariantSchema)
})

export const uiReviewIdSchema = z.object({
  reviewId: z.string().min(1)
})

export const uiReviewUploadSchema = z.object({
  reviewId: z.string(),
  imageKey: z.string()
})

export const createUiReviewSchema = z.object({
  title: z.string().trim().max(120).nullable().default(null)
})

export const updateUiFindingSchema = z.object({
  findingId: z.string().min(1),
  included: z.boolean()
})

export const generateUiRedesignSchema = z.object({
  reviewId: z.string().min(1),
  instruction: z.string().trim().max(300).nullable().default(null)
})

export type UiReviewStatus = z.output<typeof uiReviewStatusSchema>
export type UiFindingSeverity = z.output<typeof uiFindingSeveritySchema>
export type UiPlatform = z.output<typeof uiPlatformSchema>
export type UiFindingInput = z.input<typeof uiFindingSchema>
export type UiFindingOutput = z.output<typeof uiFindingSchema>
export type UiVariantInput = z.input<typeof uiVariantSchema>
export type UiVariantOutput = z.output<typeof uiVariantSchema>
export type UiReviewSummaryInput = z.input<typeof uiReviewSummarySchema>
export type UiReviewSummaryOutput = z.output<typeof uiReviewSummarySchema>
export type UiReviewListInput = z.input<typeof uiReviewListSchema>
export type UiReviewListOutput = z.output<typeof uiReviewListSchema>
export type UiReviewDetailInput = z.input<typeof uiReviewDetailSchema>
export type UiReviewDetailOutput = z.output<typeof uiReviewDetailSchema>
export type UiReviewUploadInput = z.input<typeof uiReviewUploadSchema>
export type UiReviewUploadOutput = z.output<typeof uiReviewUploadSchema>
export type UiReviewIdInput = z.input<typeof uiReviewIdSchema>
export type UiReviewIdOutput = z.output<typeof uiReviewIdSchema>
export type CreateUiReviewInput = z.input<typeof createUiReviewSchema>
export type CreateUiReviewOutput = z.output<typeof createUiReviewSchema>
export type UpdateUiFindingInput = z.input<typeof updateUiFindingSchema>
export type UpdateUiFindingOutput = z.output<typeof updateUiFindingSchema>
export type GenerateUiRedesignInput = z.input<typeof generateUiRedesignSchema>
export type GenerateUiRedesignOutput = z.output<typeof generateUiRedesignSchema>
