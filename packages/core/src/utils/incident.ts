import type { ZodType } from 'zod'

import type { IncidentTimeSource } from '../schemas/incident'
import type {
  IncidentExtractionOutput,
  IncidentMergeOutput,
  IncidentPostmortemOutput,
  IncidentQuestionsOutput,
  IncidentReadinessOutput,
  IncidentRootCauseOutput
} from '../schemas/incident-ai'
import { INCIDENT_EVENT_LIMIT } from '../constants'
import {
  incidentExtractionSchema,
  incidentMergeSchema,
  incidentPostmortemSchema,
  incidentQuestionsSchema,
  incidentReadinessSchema,
  incidentRootCauseSchema
} from '../schemas/incident-ai'
import { parseDate } from './format'

type Parsed<T> = { ok: true; result: T } | { ok: false; issues: string; output: string }

function parseStructured<T>(schema: ZodType<T>, text: string): Parsed<T> {
  let output: unknown

  try {
    output = JSON.parse(text)
  } catch (error) {
    return {
      ok: false,
      issues: `Invalid JSON: ${error instanceof Error ? error.message : 'unknown'}`,
      output: text
    }
  }

  const parsed = schema.safeParse(output)

  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join('\n'),
      output: text
    }
  }

  return { ok: true, result: parsed.data }
}

export function parseIncidentExtraction(text: string): Parsed<IncidentExtractionOutput> {
  return parseStructured(incidentExtractionSchema, text)
}

export function parseIncidentMerge(text: string): Parsed<IncidentMergeOutput> {
  return parseStructured(incidentMergeSchema, text)
}

export function parseIncidentReadiness(text: string): Parsed<IncidentReadinessOutput> {
  return parseStructured(incidentReadinessSchema, text)
}

export function parseIncidentQuestions(text: string): Parsed<IncidentQuestionsOutput> {
  return parseStructured(incidentQuestionsSchema, text)
}

export function parseIncidentRootCause(text: string): Parsed<IncidentRootCauseOutput> {
  return parseStructured(incidentRootCauseSchema, text)
}

export function parseIncidentPostmortem(text: string): Parsed<IncidentPostmortemOutput> {
  return parseStructured(incidentPostmortemSchema, text)
}

export function parseIncidentTime(value: string | null): Date | null {
  if (!value) return null

  return parseDate(value)
}

export function isGuessedTime(source: IncidentTimeSource | null): boolean {
  return source === 'screenshot' || source === 'inferred'
}

export function clampIncidentEvents<T>(events: Array<T>): Array<T> {
  return events.slice(0, INCIDENT_EVENT_LIMIT)
}

type MergeEvent = IncidentMergeOutput['events'][number]

export function sanitizeIncidentEvents(
  events: Array<MergeEvent>,
  evidenceIds: Set<string>
): Array<MergeEvent> {
  const cleaned = events.flatMap((event) => {
    const sourceEvidenceIds = [
      ...new Set(event.sourceEvidenceIds.filter((id) => evidenceIds.has(id)))
    ]

    return sourceEvidenceIds.length > 0 ? [{ ...event, sourceEvidenceIds }] : []
  })

  return clampIncidentEvents(cleaned)
}

export function sanitizeIncidentRootCause(
  cause: IncidentRootCauseOutput,
  eventIds: Set<string>
): IncidentRootCauseOutput {
  const supportingEventIds = [...new Set(cause.supportingEventIds.filter((id) => eventIds.has(id)))]

  if (cause.outcome === 'proposed' && supportingEventIds.length === 0) {
    return {
      ...cause,
      outcome: 'inconclusive',
      confidence: 'low',
      supportingEventIds,
      rootCause: `${cause.rootCause} No timeline event supports this cause, so the evidence is inconclusive.`
    }
  }

  return { ...cause, supportingEventIds }
}
