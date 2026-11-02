import { beforeEach, describe, expect, it } from 'vitest'

import type { BlueprintDetailOutput, BlueprintListOutput } from '@tars/core/schemas/blueprint'
import type { Database } from '@tars/db/client'
import {
  blueprint,
  blueprintEvidence,
  blueprintQuestion,
  blueprintRequirement,
  user
} from '@tars/db/schema'
import { eq } from '@tars/db/sql'

import { callRpc, createTestDb } from '../helpers/rpc'

let db: Database

async function createBlueprint(title = 'Booking app'): Promise<string> {
  const response = await callRpc(db, 'blueprint/create', { title, client: 'Bright Smile' })

  return (response.body as { json: BlueprintDetailOutput }).json.blueprint.id
}

beforeEach(async () => {
  db = await createTestDb()

  await db.insert(user).values({
    id: 'other-user',
    name: 'Other',
    email: 'other@tars.dev',
    emailVerified: true
  })
})

describe('blueprint CRUD', () => {
  it('creates, lists, gets, and removes a blueprint', async () => {
    const created = await callRpc(db, 'blueprint/create', {
      title: 'Booking app',
      client: 'Bright Smile'
    })
    const detail = (created.body as { json: BlueprintDetailOutput }).json

    expect(created.status).toBe(200)
    expect(detail.blueprint.status).toBe('intake')
    expect(detail.blueprint.client).toBe('Bright Smile')

    const list = await callRpc(db, 'blueprint/list')
    const page = (list.body as { json: BlueprintListOutput }).json

    expect(page.items.map((item) => item.id)).toContain(detail.blueprint.id)

    const removed = await callRpc(db, 'blueprint/remove', { id: detail.blueprint.id })

    expect(removed.status).toBe(200)
    expect(await db.select().from(blueprint)).toHaveLength(0)
  })

  it('rejects blueprints owned by someone else', async () => {
    await db
      .insert(blueprint)
      .values({ id: 'other-blueprint', userId: 'other-user', title: 'Nope' })

    const response = await callRpc(db, 'blueprint/get', { id: 'other-blueprint' })

    expect(response.status).toBe(404)
  })
})

describe('blueprint evidence limit', () => {
  it('rejects evidence past the cap', async () => {
    const id = await createBlueprint()

    await db.insert(blueprintEvidence).values(
      Array.from({ length: 12 }, (_, index) => ({
        id: `evidence-${index}`,
        blueprintId: id,
        kind: 'text' as const,
        content: 'brief',
        status: 'ready' as const
      }))
    )

    const response = await callRpc(db, 'blueprint/addEvidence', {
      blueprintId: id,
      kind: 'text',
      content: 'one more'
    })

    expect(response.status).toBe(400)
  })
})

describe('blueprint.removeEvidence', () => {
  it('removes evidence from the blueprint', async () => {
    const id = await createBlueprint()

    await db.insert(blueprintEvidence).values({
      id: 'evidence-1',
      blueprintId: id,
      kind: 'text',
      content: 'brief',
      status: 'ready'
    })

    const response = await callRpc(db, 'blueprint/removeEvidence', { evidenceId: 'evidence-1' })
    const detail = (response.body as { json: BlueprintDetailOutput }).json

    expect(response.status).toBe(200)
    expect(detail.evidence).toHaveLength(0)
    expect(await db.select().from(blueprintEvidence)).toHaveLength(0)
  })

  it('rejects evidence owned by someone else', async () => {
    await db
      .insert(blueprint)
      .values({ id: 'other-blueprint', userId: 'other-user', title: 'Nope' })
    await db.insert(blueprintEvidence).values({
      id: 'other-evidence',
      blueprintId: 'other-blueprint',
      kind: 'text',
      content: 'brief',
      status: 'ready'
    })

    const response = await callRpc(db, 'blueprint/removeEvidence', { evidenceId: 'other-evidence' })

    expect(response.status).toBe(404)
    expect(await db.select().from(blueprintEvidence)).toHaveLength(1)
  })
})

describe('blueprint requirements', () => {
  it('disables, re-enables, and removes a requirement', async () => {
    const id = await createBlueprint()

    await db.insert(blueprintRequirement).values({
      id: 'requirement-1',
      blueprintId: id,
      area: 'auth',
      text: 'Clients log in with email.',
      status: 'clear',
      confidence: 'high',
      sourceEvidenceIds: []
    })

    const disabled = await callRpc(db, 'blueprint/setRequirementEnabled', {
      requirementId: 'requirement-1',
      enabled: false
    })
    const detail = (disabled.body as { json: BlueprintDetailOutput }).json

    expect(disabled.status).toBe(200)
    expect(detail.requirements[0]?.enabled).toBe(false)

    const removed = await callRpc(db, 'blueprint/removeRequirement', {
      requirementId: 'requirement-1'
    })

    expect(removed.status).toBe(200)
    expect(await db.select().from(blueprintRequirement)).toHaveLength(0)
  })

  it('rejects requirements owned by someone else', async () => {
    await db
      .insert(blueprint)
      .values({ id: 'other-blueprint', userId: 'other-user', title: 'Nope' })
    await db.insert(blueprintRequirement).values({
      id: 'other-requirement',
      blueprintId: 'other-blueprint',
      area: 'auth',
      text: 'Clients log in with email.',
      status: 'clear',
      confidence: 'high',
      sourceEvidenceIds: []
    })

    const toggle = await callRpc(db, 'blueprint/setRequirementEnabled', {
      requirementId: 'other-requirement',
      enabled: false
    })
    const removed = await callRpc(db, 'blueprint/removeRequirement', {
      requirementId: 'other-requirement'
    })

    expect(toggle.status).toBe(404)
    expect(removed.status).toBe(404)
    expect(await db.select().from(blueprintRequirement)).toHaveLength(1)
  })
})

describe('blueprint.answerQuestion', () => {
  it('accepts an open question, stores the answer, and clears the draft', async () => {
    const id = await createBlueprint()

    await db
      .update(blueprint)
      .set({ draft: 'old draft', status: 'drafted' })
      .where(eq(blueprint.id, id))
    await db.insert(blueprintQuestion).values({
      id: 'question-1',
      blueprintId: id,
      text: 'Which site hosts the booking form?',
      rationale: 'Changes the task list.',
      gap: 'hosting',
      kind: 'select',
      options: ['Existing WordPress site', 'New site']
    })

    const response = await callRpc(db, 'blueprint/answerQuestion', {
      questionId: 'question-1',
      answer: 'The existing WordPress site.'
    })
    const detail = (response.body as { json: BlueprintDetailOutput }).json

    expect(response.status).toBe(200)
    expect(detail.questions[0]?.status).toBe('answered')
    expect(detail.questions[0]?.kind).toBe('select')
    expect(detail.questions[0]?.options).toEqual(['Existing WordPress site', 'New site'])
    expect(detail.draft).toBeNull()
    expect(detail.evidence.some((item) => item.kind === 'answer')).toBe(true)
  })

  it('rejects answering the same question twice', async () => {
    const id = await createBlueprint()

    await db.insert(blueprintQuestion).values({
      id: 'question-1',
      blueprintId: id,
      text: 'Which site hosts the booking form?',
      rationale: 'Changes the task list.',
      gap: 'hosting',
      status: 'answered',
      answer: 'The existing WordPress site.'
    })

    const response = await callRpc(db, 'blueprint/answerQuestion', {
      questionId: 'question-1',
      answer: 'Again.'
    })

    expect(response.status).toBe(404)
  })

  it('rejects answers past the evidence cap', async () => {
    const id = await createBlueprint()

    await db.insert(blueprintEvidence).values(
      Array.from({ length: 12 }, (_, index) => ({
        id: `evidence-${index}`,
        blueprintId: id,
        kind: 'text' as const,
        content: 'brief',
        status: 'ready' as const
      }))
    )
    await db.insert(blueprintQuestion).values({
      id: 'question-1',
      blueprintId: id,
      text: 'Which site?',
      rationale: 'Scope.',
      gap: 'hosting'
    })

    const response = await callRpc(db, 'blueprint/answerQuestion', {
      questionId: 'question-1',
      answer: 'The WordPress site.'
    })

    expect(response.status).toBe(400)
  })
})
