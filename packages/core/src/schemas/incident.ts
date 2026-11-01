import * as z from 'zod'

import { INCIDENT_EVIDENCE_CHARS } from '../constants'
import { ERRORS } from '../errors'

export const incidentStatusSchema = z.enum(['open', 'closed'])
export const incidentEvidenceKindSchema = z.enum(['screenshot', 'log', 'text', 'voice', 'answer'])
export const incidentEvidenceSourceSchema = z.enum(['upload', 'user'])
export const incidentEvidenceStatusSchema = z.enum(['pending', 'ready', 'error'])
export const incidentTimeSourceSchema = z.enum(['log', 'screenshot', 'user', 'inferred'])
export const incidentConfidenceSchema = z.enum(['low', 'medium', 'high'])
export const incidentQuestionStatusSchema = z.enum(['open', 'answered', 'dismissed'])
export const incidentAnalysisStatusSchema = z.enum(['draft', 'approved'])
export const incidentOutcomeSchema = z.enum(['proposed', 'inconclusive'])

export const incidentSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: incidentStatusSchema,
  summary: z.string().nullable(),
  evidenceCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const incidentListSchema = z.object({
  items: z.array(incidentSummarySchema)
})

export const incidentEvidenceSchema = z.object({
  id: z.string().min(1),
  kind: incidentEvidenceKindSchema,
  source: incidentEvidenceSourceSchema,
  content: z.string().nullable(),
  hasImage: z.boolean(),
  occurredAt: z.string().nullable(),
  timeSource: incidentTimeSourceSchema.nullable(),
  timeNote: z.string().nullable(),
  summary: z.string().nullable(),
  status: incidentEvidenceStatusSchema,
  error: z.string().nullable(),
  createdAt: z.string()
})

export const incidentEventSchema = z.object({
  id: z.string().min(1),
  occurredAt: z.string().nullable(),
  timeSource: incidentTimeSourceSchema.nullable(),
  description: z.string().min(1),
  confidence: incidentConfidenceSchema,
  sourceEvidenceIds: z.array(z.string()),
  sortOrder: z.number().int()
})

export const incidentQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  rationale: z.string().min(1),
  gap: z.string().min(1),
  status: incidentQuestionStatusSchema,
  answer: z.string().nullable(),
  answeredAt: z.string().nullable(),
  createdAt: z.string()
})

export const incidentAlternativeSchema = z.object({
  text: z.string().min(1),
  whyRejected: z.string().min(1)
})

export const incidentAnalysisSchema = z.object({
  outcome: incidentOutcomeSchema,
  rootCause: z.string().min(1),
  confidence: incidentConfidenceSchema,
  supportingEventIds: z.array(z.string()),
  alternatives: z.array(incidentAlternativeSchema),
  postmortem: z.string().nullable(),
  status: incidentAnalysisStatusSchema,
  approvedAt: z.string().nullable(),
  updatedAt: z.string()
})

export const incidentDetailSchema = z.object({
  incident: incidentSummarySchema,
  evidence: z.array(incidentEvidenceSchema),
  events: z.array(incidentEventSchema),
  questions: z.array(incidentQuestionSchema),
  analysis: incidentAnalysisSchema.nullable()
})

export const createIncidentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, ERRORS.incidentTitleRequired)
    .max(120, ERRORS.incidentTitleTooLong)
})

export const incidentIdSchema = z.object({
  incidentId: z.string().min(1)
})

export const incidentPromptSchema = z.object({
  incidentId: z.string().min(1),
  timezone: z.string().max(64).optional()
})

export const addIncidentEvidenceSchema = z
  .object({
    incidentId: z.string().min(1),
    evidenceId: z.string().uuid().optional(),
    kind: z.enum(['screenshot', 'log', 'text', 'voice']),
    content: z
      .string()
      .trim()
      .max(INCIDENT_EVIDENCE_CHARS, ERRORS.incidentEvidenceTooLong)
      .nullable()
      .default(null),
    imageKey: z.string().max(256).nullable().default(null),
    occurredAt: z.string().nullable().default(null),
    timezone: z.string().max(64).optional()
  })
  .refine(
    (input) => (input.kind === 'screenshot' ? Boolean(input.imageKey) : Boolean(input.content)),
    {
      message: ERRORS.incidentEvidenceRequired
    }
  )

export const updateIncidentEventSchema = z.object({
  eventId: z.string().min(1),
  occurredAt: z.string().nullable()
})

export const answerIncidentQuestionSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().trim().min(1, ERRORS.incidentAnswerRequired).max(4_000)
})

export const saveIncidentPostmortemSchema = z.object({
  incidentId: z.string().min(1),
  postmortem: z.string().trim().max(20_000)
})

export const incidentEvidenceIdSchema = z.object({
  evidenceId: z.string().min(1)
})

export const incidentImageUrlOutputSchema = z.object({
  url: z.string().min(1)
})

export const incidentEvidenceUploadOutputSchema = z.object({
  evidenceId: z.string(),
  imageKey: z.string()
})

export type IncidentStatus = z.output<typeof incidentStatusSchema>
export type IncidentEvidenceKind = z.output<typeof incidentEvidenceKindSchema>
export type IncidentTimeSource = z.output<typeof incidentTimeSourceSchema>
export type IncidentConfidence = z.output<typeof incidentConfidenceSchema>
export type IncidentSummaryInput = z.input<typeof incidentSummarySchema>
export type IncidentSummaryOutput = z.output<typeof incidentSummarySchema>
export type IncidentListInput = z.input<typeof incidentListSchema>
export type IncidentListOutput = z.output<typeof incidentListSchema>
export type IncidentEvidenceInput = z.input<typeof incidentEvidenceSchema>
export type IncidentEvidenceOutput = z.output<typeof incidentEvidenceSchema>
export type IncidentEventInput = z.input<typeof incidentEventSchema>
export type IncidentEventOutput = z.output<typeof incidentEventSchema>
export type IncidentQuestionInput = z.input<typeof incidentQuestionSchema>
export type IncidentQuestionOutput = z.output<typeof incidentQuestionSchema>
export type IncidentAlternativeInput = z.input<typeof incidentAlternativeSchema>
export type IncidentAlternativeOutput = z.output<typeof incidentAlternativeSchema>
export type IncidentAnalysisInput = z.input<typeof incidentAnalysisSchema>
export type IncidentAnalysisOutput = z.output<typeof incidentAnalysisSchema>
export type IncidentDetailInput = z.input<typeof incidentDetailSchema>
export type IncidentDetailOutput = z.output<typeof incidentDetailSchema>
export type CreateIncidentInput = z.input<typeof createIncidentSchema>
export type CreateIncidentOutput = z.output<typeof createIncidentSchema>
export type IncidentIdInput = z.input<typeof incidentIdSchema>
export type IncidentIdOutput = z.output<typeof incidentIdSchema>
export type IncidentPromptInput = z.input<typeof incidentPromptSchema>
export type IncidentPromptOutput = z.output<typeof incidentPromptSchema>
export type AddIncidentEvidenceInput = z.input<typeof addIncidentEvidenceSchema>
export type AddIncidentEvidenceOutput = z.output<typeof addIncidentEvidenceSchema>
export type UpdateIncidentEventInput = z.input<typeof updateIncidentEventSchema>
export type UpdateIncidentEventOutput = z.output<typeof updateIncidentEventSchema>
export type AnswerIncidentQuestionInput = z.input<typeof answerIncidentQuestionSchema>
export type AnswerIncidentQuestionOutput = z.output<typeof answerIncidentQuestionSchema>
export type SaveIncidentPostmortemInput = z.input<typeof saveIncidentPostmortemSchema>
export type SaveIncidentPostmortemOutput = z.output<typeof saveIncidentPostmortemSchema>
export type IncidentEvidenceIdInput = z.input<typeof incidentEvidenceIdSchema>
export type IncidentEvidenceIdOutput = z.output<typeof incidentEvidenceIdSchema>
export type IncidentImageUrlOutput = z.output<typeof incidentImageUrlOutputSchema>
export type IncidentEvidenceUploadOutput = z.output<typeof incidentEvidenceUploadOutputSchema>
