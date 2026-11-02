import * as z from 'zod'

import {
  INCIDENT_EVENT_LIMIT,
  INCIDENT_EVENTS_PER_EVIDENCE,
  INCIDENT_QUESTION_LIMIT
} from '../constants'
import {
  incidentAlternativeSchema,
  incidentConfidenceSchema,
  incidentOutcomeSchema,
  incidentTimeSourceSchema
} from './incident'
import { questionKindSchema } from './question'

export const incidentExtractedEventSchema = z.object({
  occurredAt: z.string().nullable(),
  timeSource: incidentTimeSourceSchema.nullable(),
  description: z.string().min(1).max(400),
  confidence: incidentConfidenceSchema
})

export const incidentExtractionSchema = z.object({
  summary: z.string().min(1).max(600),
  timeNote: z.string().max(200).nullable(),
  events: z.array(incidentExtractedEventSchema).max(INCIDENT_EVENTS_PER_EVIDENCE)
})

export const incidentMergeSchema = z.object({
  summary: z.string().min(1).max(800),
  events: z
    .array(
      incidentExtractedEventSchema.extend({
        sourceEvidenceIds: z.array(z.string().min(1)).min(1).max(12)
      })
    )
    .max(INCIDENT_EVENT_LIMIT)
})

export const incidentReadinessSchema = z.object({
  enough: z.boolean(),
  gaps: z.array(z.string().min(1).max(300)).max(INCIDENT_QUESTION_LIMIT)
})

export const incidentQuestionDraftSchema = z.object({
  text: z.string().min(1).max(300),
  rationale: z.string().min(1).max(300),
  gap: z.string().min(1).max(300),
  kind: questionKindSchema,
  options: z.array(z.string().min(1).max(60)).max(6).default([])
})

export const incidentQuestionsSchema = z.object({
  questions: z.array(incidentQuestionDraftSchema).min(1).max(INCIDENT_QUESTION_LIMIT)
})

export const incidentRootCauseSchema = z.object({
  outcome: incidentOutcomeSchema,
  rootCause: z.string().min(1).max(1_200),
  confidence: incidentConfidenceSchema,
  supportingEventIds: z.array(z.string().min(1)).max(12),
  alternatives: z.array(incidentAlternativeSchema).max(4)
})

export const incidentPostmortemSchema = z.object({
  markdown: z.string().min(1).max(20_000)
})

export const incidentExtractionJsonSchema = z.toJSONSchema(incidentExtractionSchema, {
  target: 'draft-7'
})
export const incidentMergeJsonSchema = z.toJSONSchema(incidentMergeSchema, { target: 'draft-7' })
export const incidentReadinessJsonSchema = z.toJSONSchema(incidentReadinessSchema, {
  target: 'draft-7'
})
export const incidentQuestionsJsonSchema = z.toJSONSchema(incidentQuestionsSchema, {
  target: 'draft-7'
})
export const incidentRootCauseJsonSchema = z.toJSONSchema(incidentRootCauseSchema, {
  target: 'draft-7'
})
export const incidentPostmortemJsonSchema = z.toJSONSchema(incidentPostmortemSchema, {
  target: 'draft-7'
})

export type IncidentExtractionInput = z.input<typeof incidentExtractionSchema>
export type IncidentExtractionOutput = z.output<typeof incidentExtractionSchema>
export type IncidentMergeInput = z.input<typeof incidentMergeSchema>
export type IncidentMergeOutput = z.output<typeof incidentMergeSchema>
export type IncidentReadinessInput = z.input<typeof incidentReadinessSchema>
export type IncidentReadinessOutput = z.output<typeof incidentReadinessSchema>
export type IncidentQuestionDraftInput = z.input<typeof incidentQuestionDraftSchema>
export type IncidentQuestionDraftOutput = z.output<typeof incidentQuestionDraftSchema>
export type IncidentQuestionsInput = z.input<typeof incidentQuestionsSchema>
export type IncidentQuestionsOutput = z.output<typeof incidentQuestionsSchema>
export type IncidentRootCauseInput = z.input<typeof incidentRootCauseSchema>
export type IncidentRootCauseOutput = z.output<typeof incidentRootCauseSchema>
export type IncidentPostmortemInput = z.input<typeof incidentPostmortemSchema>
export type IncidentPostmortemOutput = z.output<typeof incidentPostmortemSchema>
