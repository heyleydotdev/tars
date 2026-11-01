import { beforeEach, describe, expect, it } from 'vitest'

import type { MeasureReferenceListOutput } from '@tars/core/schemas/measure'
import type { Database } from '@tars/db/client'
import { measureReference, user } from '@tars/db/schema'

import { callRpc, createTestDb, TEST_USER_ID } from '../helpers/rpc'

let db: Database

beforeEach(async () => {
  db = await createTestDb()

  await db.insert(user).values({
    id: 'other-user',
    name: 'Other',
    email: 'other@tars.dev',
    emailVerified: true
  })
})

describe('measure.references', () => {
  it('returns global references and the session user references only', async () => {
    await db.insert(measureReference).values([
      {
        id: 'global-ref',
        userId: null,
        label: 'Bank card',
        prompt: 'card',
        widthMm: 85.6,
        heightMm: 54,
        sortOrder: 0
      },
      {
        id: 'own-ref',
        userId: TEST_USER_ID,
        label: 'A4 paper',
        prompt: 'paper',
        widthMm: 210,
        heightMm: 297,
        sortOrder: 1
      },
      {
        id: 'other-ref',
        userId: 'other-user',
        label: 'Coin',
        prompt: 'coin',
        widthMm: 24,
        heightMm: 24,
        sortOrder: 0
      }
    ])

    const response = await callRpc(db, 'measure/references')
    const list = (response.body as { json: MeasureReferenceListOutput }).json

    const ids = list.items.map((item) => item.id)

    expect(ids).toContain('global-ref')
    expect(ids).toContain('own-ref')
    expect(ids).not.toContain('other-ref')
  })
})

describe('measure.createReference', () => {
  it('creates a reference owned by the session user', async () => {
    const response = await callRpc(db, 'measure/createReference', {
      label: 'Credit card',
      prompt: 'card',
      widthMm: 85.6,
      heightMm: 54
    })
    const created = (response.body as { json: { label: string; prompt: string } }).json

    expect(response.status).toBe(200)
    expect(created).toMatchObject({ label: 'Credit card', prompt: 'card' })
  })

  it('rejects an empty label', async () => {
    const response = await callRpc(db, 'measure/createReference', {
      label: '',
      prompt: 'card',
      widthMm: 85.6,
      heightMm: 54
    })

    expect(response.status).toBe(400)
  })
})
