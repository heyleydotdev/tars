import { beforeEach, describe, expect, it } from 'vitest'

import type { IncidentDetailOutput, IncidentListOutput } from '@tars/core/schemas/incident'
import type { Database } from '@tars/db/client'
import { verifyFileKey } from '@tars/core/services/files'
import { incident, incidentEvent, incidentEvidence, incidentQuestion } from '@tars/db/schema'

import { callRpc, createTestDb, createTestFiles, TEST_USER_ID } from '../helpers/rpc'

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

const IMAGE_KEY = `incident/${TEST_USER_ID}/${INCIDENT_ID}/evidence-1.jpg`

describe('incident.imageUrl', () => {
  it('signs an image URL for owned evidence', async () => {
    await db.insert(incidentEvidence).values({
      id: 'evidence-1',
      incidentId: INCIDENT_ID,
      kind: 'screenshot',
      source: 'upload',
      imageKey: IMAGE_KEY,
      status: 'ready'
    })

    const response = await callRpc(db, 'incident/imageUrl', { evidenceId: 'evidence-1' })
    const { url } = (response.body as { json: { url: string } }).json
    const signature = new URL(url, 'http://test').searchParams.get('sig') ?? ''

    expect(url).toMatch(/^\/api\/files\/incident\/user-test\/incident-1\/evidence-1\.jpg\?sig=/)
    expect(
      await verifyFileKey('file-secret-file-secret-file-secret-32', IMAGE_KEY, signature)
    ).toBe(true)
  })

  it('rejects evidence without an image', async () => {
    await db.insert(incidentEvidence).values({
      id: 'evidence-text',
      incidentId: INCIDENT_ID,
      kind: 'text',
      source: 'upload',
      content: 'note',
      status: 'ready'
    })

    const response = await callRpc(db, 'incident/imageUrl', { evidenceId: 'evidence-text' })

    expect(response.status).toBe(404)
  })
})

describe('incident.evidenceUpload', () => {
  it('reserves a key owned by the session user', async () => {
    const response = await callRpc(db, 'incident/evidenceUpload', { incidentId: INCIDENT_ID })
    const target = (response.body as { json: { evidenceId: string; imageKey: string } }).json

    expect(response.status).toBe(200)
    expect(target.imageKey).toBe(`incident/${TEST_USER_ID}/${INCIDENT_ID}/${target.evidenceId}.jpg`)
  })
})

describe('incident.addEvidence', () => {
  it('rejects an image key that is not the reserved evidence key', async () => {
    const response = await callRpc(db, 'incident/addEvidence', {
      incidentId: INCIDENT_ID,
      evidenceId: 'evidence-2',
      kind: 'screenshot',
      imageKey: `incident/${TEST_USER_ID}/${INCIDENT_ID}/other.jpg`
    })

    expect(response.status).toBe(400)
  })

  it('rejects a key that was never uploaded', async () => {
    const files = createTestFiles()
    const response = await callRpc(
      db,
      'incident/addEvidence',
      {
        incidentId: INCIDENT_ID,
        evidenceId: 'evidence-3',
        kind: 'screenshot',
        imageKey: `incident/${TEST_USER_ID}/${INCIDENT_ID}/evidence-3.jpg`
      },
      files
    )

    expect(response.status).toBe(400)
  })
})
