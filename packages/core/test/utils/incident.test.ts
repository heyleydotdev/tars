import { describe, expect, it } from 'vitest'

import type { IncidentMergeOutput, IncidentRootCauseOutput } from '../../src/schemas/incident-ai'
import { INCIDENT_EVENT_LIMIT } from '../../src/constants'
import {
  clampIncidentEvents,
  isGuessedTime,
  parseIncidentMerge,
  parseIncidentTime,
  sanitizeIncidentEvents,
  sanitizeIncidentRootCause
} from '../../src/utils/incident'

function mergeEvent(overrides: Partial<IncidentMergeOutput['events'][number]> = {}) {
  return {
    occurredAt: '2026-11-01T10:00:00.000Z',
    timeSource: 'log' as const,
    description: 'Deploy finished',
    confidence: 'high' as const,
    sourceEvidenceIds: ['evidence-1'],
    ...overrides
  }
}

describe('parseIncidentMerge', () => {
  it('parses a valid merge payload', () => {
    const parsed = parseIncidentMerge(
      JSON.stringify({ summary: 'Deploy caused the spike.', events: [mergeEvent()] })
    )

    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.result.events).toHaveLength(1)
  })

  it('reports invalid json separately from schema issues', () => {
    const invalidJson = parseIncidentMerge('not json')
    const invalidShape = parseIncidentMerge(
      JSON.stringify({ summary: 'ok', events: [{ description: '' }] })
    )

    expect(invalidJson.ok).toBe(false)
    if (!invalidJson.ok) expect(invalidJson.issues).toContain('Invalid JSON')

    expect(invalidShape.ok).toBe(false)
    if (!invalidShape.ok) expect(invalidShape.issues).toContain('events')
  })
})

describe('incident times', () => {
  it('parses valid times and rejects invalid ones', () => {
    expect(parseIncidentTime(null)).toBeNull()
    expect(parseIncidentTime('nope')).toBeNull()
    expect(parseIncidentTime('2026-11-01T10:00:00.000Z')?.toISOString()).toBe(
      '2026-11-01T10:00:00.000Z'
    )
  })

  it('treats screenshot and inferred times as guessed', () => {
    expect(isGuessedTime('screenshot')).toBe(true)
    expect(isGuessedTime('inferred')).toBe(true)
    expect(isGuessedTime('log')).toBe(false)
    expect(isGuessedTime('user')).toBe(false)
    expect(isGuessedTime(null)).toBe(false)
  })
})

describe('clampIncidentEvents', () => {
  it('caps the list at the incident event limit', () => {
    const events = Array.from({ length: INCIDENT_EVENT_LIMIT + 5 }, (_, index) => index)

    expect(clampIncidentEvents(events)).toHaveLength(INCIDENT_EVENT_LIMIT)
    expect(clampIncidentEvents(events).at(-1)).toBe(INCIDENT_EVENT_LIMIT - 1)
  })
})

describe('sanitizeIncidentEvents', () => {
  it('keeps only known evidence and dedupes sources', () => {
    const cleaned = sanitizeIncidentEvents(
      [
        mergeEvent({ sourceEvidenceIds: ['evidence-1', 'evidence-1', 'missing'] }),
        mergeEvent({ sourceEvidenceIds: ['missing'] })
      ],
      new Set(['evidence-1'])
    )

    expect(cleaned).toHaveLength(1)
    expect(cleaned[0]?.sourceEvidenceIds).toEqual(['evidence-1'])
  })
})

describe('sanitizeIncidentRootCause', () => {
  function cause(overrides: Partial<IncidentRootCauseOutput> = {}): IncidentRootCauseOutput {
    return {
      outcome: 'proposed',
      rootCause: 'A retry storm saturated the gateway.',
      confidence: 'high',
      supportingEventIds: ['event-1'],
      alternatives: [],
      ...overrides
    }
  }

  it('keeps a supported cause and dedupes citations', () => {
    const cleaned = sanitizeIncidentRootCause(
      cause({ supportingEventIds: ['event-1', 'event-1', 'missing'] }),
      new Set(['event-1'])
    )

    expect(cleaned.outcome).toBe('proposed')
    expect(cleaned.supportingEventIds).toEqual(['event-1'])
  })

  it('forces an unsupported cause to inconclusive', () => {
    const cleaned = sanitizeIncidentRootCause(
      cause({ supportingEventIds: ['missing'] }),
      new Set(['event-1'])
    )

    expect(cleaned.outcome).toBe('inconclusive')
    expect(cleaned.confidence).toBe('low')
    expect(cleaned.supportingEventIds).toEqual([])
    expect(cleaned.rootCause).toContain('inconclusive')
  })
})
