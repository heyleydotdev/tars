import * as z from 'zod'

import { ERRORS } from '../errors'

export const blueprintStatusSchema = z.enum(['intake', 'mapped', 'ready', 'drafted'])
export const blueprintRequirementStatusSchema = z.enum([
  'clear',
  'ambiguous',
  'missing',
  'suggested'
])
export const blueprintConfidenceSchema = z.enum(['low', 'medium', 'high'])
export const blueprintEvidenceKindSchema = z.enum(['text', 'screenshot', 'voice', 'answer'])
export const blueprintQuestionStatusSchema = z.enum(['open', 'answered', 'dismissed'])

export const blueprintSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  client: z.string().nullable(),
  status: blueprintStatusSchema,
  summary: z.string().nullable(),
  requirementCount: z.number().int().nonnegative(),
  openQuestions: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const blueprintListSchema = z.object({
  items: z.array(blueprintSummarySchema)
})

export const blueprintEvidenceSchema = z.object({
  id: z.string().min(1),
  kind: blueprintEvidenceKindSchema,
  content: z.string().nullable(),
  summary: z.string().nullable(),
  hasImage: z.boolean(),
  status: z.enum(['pending', 'ready', 'error']),
  error: z.string().nullable(),
  createdAt: z.string()
})

export const blueprintRequirementSchema = z.object({
  id: z.string().min(1),
  area: z.string().min(1),
  text: z.string().min(1),
  status: blueprintRequirementStatusSchema,
  confidence: blueprintConfidenceSchema,
  sourceEvidenceIds: z.array(z.string()),
  enabled: z.boolean()
})

export const blueprintQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  rationale: z.string().min(1),
  gap: z.string().min(1),
  status: blueprintQuestionStatusSchema,
  answer: z.string().nullable(),
  answeredAt: z.string().nullable(),
  createdAt: z.string()
})

export const blueprintDetailSchema = z.object({
  blueprint: blueprintSummarySchema,
  evidence: z.array(blueprintEvidenceSchema),
  requirements: z.array(blueprintRequirementSchema),
  questions: z.array(blueprintQuestionSchema),
  draft: z.string().nullable()
})

export const createBlueprintSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, ERRORS.blueprintTitleRequired)
    .max(120, ERRORS.blueprintTitleTooLong),
  client: z.string().trim().max(80).nullable().default(null)
})

export const blueprintIdSchema = z.object({
  id: z.string().min(1)
})

export const addBlueprintEvidenceSchema = z.object({
  blueprintId: z.string().min(1),
  kind: z.enum(['text', 'voice']),
  content: z
    .string()
    .trim()
    .min(1, ERRORS.blueprintEvidenceRequired)
    .max(12_000, ERRORS.blueprintEvidenceTooLong)
})

export const blueprintEvidenceIdSchema = z.object({
  evidenceId: z.string().min(1)
})

export const blueprintRequirementIdSchema = z.object({
  requirementId: z.string().min(1)
})

export const setBlueprintRequirementEnabledSchema = z.object({
  requirementId: z.string().min(1),
  enabled: z.boolean()
})

export const answerBlueprintQuestionSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().trim().min(1, ERRORS.blueprintAnswerRequired).max(4_000)
})

export const saveBlueprintDraftSchema = z.object({
  blueprintId: z.string().min(1),
  draft: z.string().trim().max(24_000)
})

export type BlueprintStatus = z.output<typeof blueprintStatusSchema>
export type BlueprintRequirementStatus = z.output<typeof blueprintRequirementStatusSchema>
export type BlueprintConfidence = z.output<typeof blueprintConfidenceSchema>
export type BlueprintSummaryInput = z.input<typeof blueprintSummarySchema>
export type BlueprintSummaryOutput = z.output<typeof blueprintSummarySchema>
export type BlueprintListInput = z.input<typeof blueprintListSchema>
export type BlueprintListOutput = z.output<typeof blueprintListSchema>
export type BlueprintEvidenceInput = z.input<typeof blueprintEvidenceSchema>
export type BlueprintEvidenceOutput = z.output<typeof blueprintEvidenceSchema>
export type BlueprintRequirementInput = z.input<typeof blueprintRequirementSchema>
export type BlueprintRequirementOutput = z.output<typeof blueprintRequirementSchema>
export type BlueprintQuestionInput = z.input<typeof blueprintQuestionSchema>
export type BlueprintQuestionOutput = z.output<typeof blueprintQuestionSchema>
export type BlueprintDetailInput = z.input<typeof blueprintDetailSchema>
export type BlueprintDetailOutput = z.output<typeof blueprintDetailSchema>
export type CreateBlueprintInput = z.input<typeof createBlueprintSchema>
export type CreateBlueprintOutput = z.output<typeof createBlueprintSchema>
export type BlueprintIdInput = z.input<typeof blueprintIdSchema>
export type BlueprintIdOutput = z.output<typeof blueprintIdSchema>
export type AddBlueprintEvidenceInput = z.input<typeof addBlueprintEvidenceSchema>
export type AddBlueprintEvidenceOutput = z.output<typeof addBlueprintEvidenceSchema>
export type BlueprintEvidenceIdInput = z.input<typeof blueprintEvidenceIdSchema>
export type BlueprintEvidenceIdOutput = z.output<typeof blueprintEvidenceIdSchema>
export type BlueprintRequirementIdInput = z.input<typeof blueprintRequirementIdSchema>
export type BlueprintRequirementIdOutput = z.output<typeof blueprintRequirementIdSchema>
export type SetBlueprintRequirementEnabledInput = z.input<
  typeof setBlueprintRequirementEnabledSchema
>
export type SetBlueprintRequirementEnabledOutput = z.output<
  typeof setBlueprintRequirementEnabledSchema
>
export type AnswerBlueprintQuestionInput = z.input<typeof answerBlueprintQuestionSchema>
export type AnswerBlueprintQuestionOutput = z.output<typeof answerBlueprintQuestionSchema>
export type SaveBlueprintDraftInput = z.input<typeof saveBlueprintDraftSchema>
export type SaveBlueprintDraftOutput = z.output<typeof saveBlueprintDraftSchema>
