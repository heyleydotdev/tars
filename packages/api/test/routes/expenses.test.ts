import { beforeEach, describe, expect, it } from 'vitest'

import type { ExpenseListOutput } from '@tars/core/schemas/expenses'
import type { Database } from '@tars/db/client'
import { expense } from '@tars/db/schema'

import { callRpc, createTestDb, TEST_USER_ID } from '../helpers/rpc'

const at = (day: number, hour: number): string =>
  new Date(Date.UTC(2026, 10, day, hour)).toISOString()

let db: Database

beforeEach(async () => {
  db = await createTestDb()
})

describe('expenses.create', () => {
  it('stores a manual expense without a chat message', async () => {
    const response = await callRpc(db, 'expenses/create', {
      title: 'Coffee',
      description: 'Flat white',
      amount: 4.5,
      currency: 'USD',
      category: 'food',
      occurredAt: at(1, 9)
    })

    expect(response.status).toBe(200)

    const rows = await db.select().from(expense)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      userId: TEST_USER_ID,
      messageId: null,
      title: 'Coffee',
      amountCents: 450
    })
  })

  it('lists the manual expense', async () => {
    await callRpc(db, 'expenses/create', {
      title: 'Train',
      description: '',
      amount: 18,
      currency: 'USD',
      category: 'transport',
      occurredAt: at(1, 8)
    })

    const response = await callRpc(db, 'expenses/list')
    const items = (response.body as { json: ExpenseListOutput }).json.items

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ title: 'Train', amountCents: 1800, category: 'transport' })
  })

  it('rejects a zero amount', async () => {
    const response = await callRpc(db, 'expenses/create', {
      title: 'Free coffee',
      description: '',
      amount: 0,
      currency: 'USD',
      category: 'food',
      occurredAt: at(1, 9)
    })

    expect(response.status).toBe(400)
    expect(await db.select().from(expense)).toHaveLength(0)
  })
})
