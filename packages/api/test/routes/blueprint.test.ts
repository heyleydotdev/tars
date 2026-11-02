import { beforeEach, describe, expect, it } from 'vitest'

import type { BlueprintDetailOutput, BlueprintListOutput } from '@tars/core/schemas/blueprint'
import type { Database } from '@tars/db/client'
import { blueprint, blueprintEvidence, blueprintQuestion, user } from '@tars/db/schema'
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
      gap: 'hosting'
    })

    const response = await callRpc(db, 'blueprint/answerQuestion', {
      questionId: 'question-1',
      answer: 'The existing WordPress site.'
    })
    const detail = (response.body as { json: BlueprintDetailOutput }).json

    expect(response.status).toBe(200)
    expect(detail.questions[0]?.status).toBe('answered')
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
