import { beforeEach, describe, expect, it } from 'vitest'

import type { UsageSummaryOutput } from '@tars/core/schemas/usage'
import type { Database } from '@tars/db/client'
import { DEFAULT_USAGE_CAP_MICROS } from '@tars/core/constants'
import { usageEvent } from '@tars/db/schema'

import { callRpc, createTestDb, TEST_USER_ID } from '../helpers/rpc'

let db: Database

beforeEach(async () => {
  db = await createTestDb()
})

describe('usage.summary', () => {
  it('totals cost and keeps the latest calls', async () => {
    await db.insert(usageEvent).values([
      {
        id: 'one',
        userId: TEST_USER_ID,
        feature: 'blueprint',
        model: 'muse-spark-1.3',
        inputTokens: 1_000,
        outputTokens: 500,
        costMicros: 120_000,
        createdAt: new Date('2026-11-01T10:00:00.000Z')
      },
      {
        id: 'two',
        userId: TEST_USER_ID,
        feature: 'blueprint',
        model: 'muse-spark-1.3',
        inputTokens: 500,
        outputTokens: 200,
        costMicros: 40_000,
        createdAt: new Date('2026-11-02T10:00:00.000Z')
      },
      {
        id: 'three',
        userId: TEST_USER_ID,
        feature: 'incident',
        model: 'muse-spark-1.3',
        inputTokens: 200,
        outputTokens: 100,
        costMicros: 10_000,
        createdAt: new Date('2026-11-03T10:00:00.000Z')
      }
    ])

    const response = await callRpc(db, 'usage/summary')
    const summary = (response.body as { json: UsageSummaryOutput }).json

    expect(response.status).toBe(200)
    expect(summary.spentMicros).toBe(170_000)
    expect(summary.remainingMicros).toBe(DEFAULT_USAGE_CAP_MICROS - 170_000)
    expect(summary.calls).toBe(3)
    expect(summary.models).toEqual([{ model: 'muse-spark-1.3', calls: 3, costMicros: 170_000 }])
    expect(summary.events).toHaveLength(3)
    expect(summary.events[0]?.id).toBe('three')
  })

  it('caps the remaining tier at zero', async () => {
    await db.insert(usageEvent).values({
      id: 'over',
      userId: TEST_USER_ID,
      feature: 'chat',
      model: 'muse-spark-1.3',
      inputTokens: 1,
      outputTokens: 1,
      costMicros: DEFAULT_USAGE_CAP_MICROS + 1
    })

    const response = await callRpc(db, 'usage/summary')
    const summary = (response.body as { json: UsageSummaryOutput }).json

    expect(summary.remainingMicros).toBe(0)
  })
})
