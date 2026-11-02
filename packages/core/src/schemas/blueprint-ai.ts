import * as z from 'zod'

import { BLUEPRINT_QUESTION_LIMIT, BLUEPRINT_REQUIREMENT_LIMIT } from '../constants'
import { blueprintConfidenceSchema, blueprintRequirementStatusSchema } from './blueprint'

export const blueprintExtractedRequirementSchema = z.object({
  area: z.string().min(1).max(40),
  text: z.string().min(1).max(300),
  status: blueprintRequirementStatusSchema,
  confidence: blueprintConfidenceSchema,
  sourceEvidenceIds: z.array(z.string().min(1)).max(12)
})

export const blueprintExtractionSchema = z.object({
  summary: z.string().min(1).max(600),
  requirements: z.array(blueprintExtractedRequirementSchema).max(BLUEPRINT_REQUIREMENT_LIMIT)
})

export const blueprintReadinessSchema = z.object({
  enough: z.boolean(),
  gaps: z.array(z.string().min(1).max(300)).max(BLUEPRINT_QUESTION_LIMIT)
})

export const blueprintQuestionDraftSchema = z.object({
  text: z.string().min(1).max(300),
  rationale: z.string().min(1).max(300),
  gap: z.string().min(1).max(300)
})

export const blueprintQuestionsSchema = z.object({
  questions: z.array(blueprintQuestionDraftSchema).min(1).max(BLUEPRINT_QUESTION_LIMIT)
})

export const blueprintDraftSchema = z.object({
  draft: z.string().min(1).max(24_000)
})

export const blueprintExtractionJsonSchema = z.toJSONSchema(blueprintExtractionSchema, {
  target: 'draft-7'
})
export const blueprintReadinessJsonSchema = z.toJSONSchema(blueprintReadinessSchema, {
  target: 'draft-7'
})
export const blueprintQuestionsJsonSchema = z.toJSONSchema(blueprintQuestionsSchema, {
  target: 'draft-7'
})
export const blueprintDraftJsonSchema = z.toJSONSchema(blueprintDraftSchema, {
  target: 'draft-7'
})

export type BlueprintExtractedRequirementInput = z.input<typeof blueprintExtractedRequirementSchema>
export type BlueprintExtractedRequirementOutput = z.output<
  typeof blueprintExtractedRequirementSchema
>
export type BlueprintExtractionInput = z.input<typeof blueprintExtractionSchema>
export type BlueprintExtractionOutput = z.output<typeof blueprintExtractionSchema>
export type BlueprintReadinessInput = z.input<typeof blueprintReadinessSchema>
export type BlueprintReadinessOutput = z.output<typeof blueprintReadinessSchema>
export type BlueprintQuestionsInput = z.input<typeof blueprintQuestionsSchema>
export type BlueprintQuestionsOutput = z.output<typeof blueprintQuestionsSchema>
export type BlueprintDraftInput = z.input<typeof blueprintDraftSchema>
export type BlueprintDraftOutput = z.output<typeof blueprintDraftSchema>
