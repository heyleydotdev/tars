import { beforeEach, describe, expect, it } from 'vitest'

import type { MeasureResultOutput, MeasureSavedListOutput } from '@tars/core/schemas/measure'
import type { Database } from '@tars/db/client'
import { measureRun, measureRunItem, user } from '@tars/db/schema'
import { eq } from '@tars/db/sql'

import { callRpc, createTestDb, createTestFiles, TEST_USER_ID } from '../helpers/rpc'

const BOX = { x1: 0, y1: 0, x2: 10, y2: 10, width: 10, height: 10 }

const RESULT: MeasureResultOutput = {
  image: { width: 100, height: 80 },
  scaleMmPerPx: 0.5,
  reference: {
    id: 'card',
    label: 'Bank card',
    prompt: 'card',
    widthMm: 85.6,
    heightMm: 54,
    box: BOX,
    matches: 1
  },
  objects: [{ prompt: 'box', box: BOX, widthMm: 5, heightMm: 5 }],
  prompts: ['box'],
  missingPrompts: []
}

const RUN_1_FIRST = '11111111-1111-4111-8111-111111111111'
const RUN_1_SECOND = '11111111-1111-4111-8111-111111111112'
const RUN_2_ONLY = '22222222-2222-4222-8222-222222222222'
const OTHER_ONLY = '44444444-4444-4444-8444-444444444444'
const RUN_1 = [RUN_1_FIRST, RUN_1_SECOND]
const RUN_2 = [RUN_2_ONLY]
const OTHER_RUN = [OTHER_ONLY]

const ITEM_IDS: Record<string, Array<string>> = {
  'run-1': RUN_1,
  'run-2': RUN_2,
  'other-run': OTHER_RUN
}

let db: Database

async function seedRun(id: string, createdAt: Date, userId = TEST_USER_ID): Promise<void> {
  const itemIds = ITEM_IDS[id as keyof typeof ITEM_IDS] as Array<string>

  await db.insert(measureRun).values({
    id,
    userId,
    referenceLabel: 'Bank card',
    referencePrompt: 'card',
    referenceWidthMm: 85.6,
    referenceHeightMm: 54,
    prompts: ['box'],
    unit: 'mm',
    itemCount: itemIds.length,
    measuredCount: itemIds.length,
    coverThumb: 'data:image/png;base64,AA==',
    status: 'ready',
    createdAt
  })
  await db.insert(measureRunItem).values(
    itemIds.map((itemId, index) => ({
      id: itemId,
      runId: id,
      name: `${id}-${index}.jpg`,
      sortOrder: index,
      status: 'done' as const,
      error: null,
      imageWidth: 100,
      imageHeight: 80,
      result: RESULT,
      imageKey: `measure/${userId}/${id}/${itemId}.jpg`,
      thumbKey: `measure/${userId}/${id}/${itemId}-thumb.jpg`
    }))
  )
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

describe('measure.saved.list', () => {
  it('returns measured photos one by one, newest first', async () => {
    await seedRun('run-1', new Date('2026-11-01T10:00:00.000Z'))
    await seedRun('run-2', new Date('2026-11-01T11:00:00.000Z'))

    const response = await callRpc(db, 'measure/saved/list', {})
    const page = (response.body as { json: MeasureSavedListOutput }).json

    expect(response.status).toBe(200)
    expect(page.items.map((item) => item.id)).toEqual([RUN_2_ONLY, RUN_1_FIRST, RUN_1_SECOND])
    expect(page.items[1]).toMatchObject({
      runId: 'run-1',
      referenceLabel: 'Bank card',
      name: 'run-1-0.jpg',
      imageUrl: expect.stringContaining('/api/files/measure/')
    })
  })

  it('pages with a cursor without dropping bulk siblings', async () => {
    await seedRun('run-1', new Date('2026-11-01T10:00:00.000Z'))
    await seedRun('run-2', new Date('2026-11-01T11:00:00.000Z'))

    const first = await callRpc(db, 'measure/saved/list', { limit: 2 })
    const page = (first.body as { json: MeasureSavedListOutput }).json
    const second = await callRpc(db, 'measure/saved/list', {
      limit: 2,
      cursor: page.nextCursor
    })
    const next = (second.body as { json: MeasureSavedListOutput }).json

    expect(page.nextCursor).toBeTruthy()
    expect(next.items.map((item) => item.id)).toEqual([RUN_1_SECOND])
    expect(next.nextCursor).toBeNull()
  })

  it('ignores other users and draft runs', async () => {
    await seedRun('run-1', new Date('2026-11-01T10:00:00.000Z'))
    await seedRun('other-run', new Date('2026-11-01T12:00:00.000Z'), 'other-user')

    const response = await callRpc(db, 'measure/saved/list', {})
    const page = (response.body as { json: MeasureSavedListOutput }).json

    expect(page.items.every((item) => item.runId === 'run-1')).toBe(true)
  })
})

describe('measure.saved.update', () => {
  it('replaces the stored result', async () => {
    await seedRun('run-1', new Date('2026-11-01T10:00:00.000Z'))
    const updated = { ...RESULT, scaleMmPerPx: 0.75 }
    const response = await callRpc(db, 'measure/saved/update', {
      items: [{ id: RUN_1_FIRST, result: updated }]
    })

    expect(response.status).toBe(200)

    const [row] = await db.select().from(measureRunItem).where(eq(measureRunItem.id, RUN_1_FIRST))

    expect((row?.result as MeasureResultOutput).scaleMmPerPx).toBe(0.75)
  })

  it('rejects photos owned by someone else', async () => {
    await seedRun('other-run', new Date('2026-11-01T12:00:00.000Z'), 'other-user')

    const response = await callRpc(db, 'measure/saved/update', {
      items: [{ id: OTHER_ONLY, result: RESULT }]
    })

    expect(response.status).toBe(404)
  })
})

describe('measure.saved.remove', () => {
  it('removes one photo and keeps the rest of the batch', async () => {
    await seedRun('run-1', new Date('2026-11-01T10:00:00.000Z'))

    const response = await callRpc(db, 'measure/saved/remove', { id: RUN_1_FIRST })

    expect(response.status).toBe(200)

    const remaining = await db.select().from(measureRunItem)
    const runs = await db.select().from(measureRun)

    expect(remaining.map((item) => item.id)).toEqual([RUN_1_SECOND])
    expect(runs).toHaveLength(1)
  })

  it('removes the container once the last photo is gone', async () => {
    await seedRun('run-2', new Date('2026-11-01T11:00:00.000Z'))

    await callRpc(db, 'measure/saved/remove', { id: RUN_2_ONLY })

    expect(await db.select().from(measureRun)).toHaveLength(0)
    expect(await db.select().from(measureRunItem)).toHaveLength(0)
  })

  it('rejects photos owned by someone else', async () => {
    await seedRun('other-run', new Date('2026-11-01T12:00:00.000Z'), 'other-user')

    const files = createTestFiles()
    const response = await callRpc(db, 'measure/saved/remove', { id: OTHER_ONLY }, files)

    expect(response.status).toBe(404)
    expect(await db.select().from(measureRunItem)).toHaveLength(1)
  })
})

describe('saved id contract', () => {
  it('keeps the photo id the client saves with, so later edits find it', async () => {
    const id = '55555555-5555-4555-8555-555555555555'
    const begun = await callRpc(db, 'measure/history/begin', {
      referenceId: null,
      referenceLabel: 'Bank card',
      referencePrompt: 'card',
      referenceWidthMm: 85.6,
      referenceHeightMm: 54,
      prompts: ['box'],
      unit: 'mm',
      coverThumb: 'data:image/png;base64,AA==',
      items: [
        {
          id,
          name: 'photo.jpg',
          status: 'done',
          error: null,
          imageWidth: 100,
          imageHeight: 80,
          result: RESULT
        }
      ]
    })

    expect(begun.status).toBe(200)

    await callRpc(db, 'measure/history/complete', {
      id: (begun.body as { json: { runId: string } }).json.runId
    })

    const update = await callRpc(db, 'measure/saved/update', {
      items: [{ id, result: { ...RESULT, scaleMmPerPx: 0.9 } }]
    })

    expect(update.status).toBe(200)
  })
})
