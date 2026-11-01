import { beforeEach, describe, expect, it } from 'bun:test'

import type { IncidentDetailOutput, IncidentListOutput } from '@tars/core/schemas/incident'
import type { Database } from '@tars/db/client'
import { incident, incidentEvent, incidentQuestion } from '@tars/db/schema'

import { callRpc, createTestDb, TEST_USER_ID } from '../helpers/rpc'

const INCIDENT_ID = 'incident-1'
const QUESTION_ID = 'question-1'

let db: Database

beforeEach(async () => {
  db = await createTestDb()

  await db.insert(incident).values({
    id: INCIDENT_ID,
    userId: TEST_USER_ID,
    title: 'Checkout latency spike'
  })
  await db.insert(incidentEvent).values({
    id: 'event-1',
    incidentId: INCIDENT_ID,
    occurredAt: new Date('2026-11-01T10:00:00.000Z'),
    timeSource: 'log',
    description: 'Deploy finished',
    confidence: 'high',
    sourceEvidenceIds: [],
    sortOrder: 0
  })
  await db.insert(incidentQuestion).values({
    id: QUESTION_ID,
    incidentId: INCIDENT_ID,
    text: 'Was a flag changed?',
    rationale: 'Flag changes explain the latency spike.',
    gap: 'flag change'
  })
})

describe('incident.create', () => {
  it('creates an open incident', async () => {
    const response = await callRpc(db, 'incident/create', { title: 'Payment errors' })
    const detail = (response.body as { json: IncidentDetailOutput }).json

    expect(response.status).toBe(200)
    expect(detail.incident.title).toBe('Payment errors')
    expect(detail.incident.status).toBe('open')
  })
})

describe('incident.list', () => {
  it('returns incidents for the session user', async () => {
    const response = await callRpc(db, 'incident/list')
    const list = (response.body as { json: IncidentListOutput }).json

    expect(list.items.map((item) => item.id)).toContain(INCIDENT_ID)
  })
})

describe('incident.answerQuestion', () => {
  it('stores the answer as evidence without inventing a timeline event', async () => {
    const response = await callRpc(db, 'incident/answerQuestion', {
      questionId: QUESTION_ID,
      answer: 'No flag changed.'
    })
    const detail = (response.body as { json: IncidentDetailOutput }).json

    expect(response.status).toBe(200)
    expect(detail.events.map((event) => event.id)).toEqual(['event-1'])
    expect(detail.questions[0]).toMatchObject({
      id: QUESTION_ID,
      status: 'answered',
      answer: 'No flag changed.'
    })
    expect(detail.evidence).toHaveLength(1)
    expect(detail.evidence[0]).toMatchObject({
      kind: 'answer',
      occurredAt: null,
      content: 'No flag changed.'
    })
  })
})
