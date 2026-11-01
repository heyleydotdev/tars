import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage } from '@tars/core/schemas/chat'
import type { Database } from '@tars/db/client'
import { chat, chatMessage, chatThinking, expense, journalEntry } from '@tars/db/schema'
import { eq } from '@tars/db/sql'

import { callRpc, callRpcRaw, createTestDb, TEST_USER_ID } from '../helpers/rpc'

const mocks = vi.hoisted(() => ({
  create: vi.fn(async () => ({
    output_text: '## Highlights\nShipped the migration.',
    status: 'completed',
    usage: {
      input_tokens: 10,
      output_tokens: 20,
      output_tokens_details: { reasoning_tokens: 0 }
    },
    output: []
  }))
}))

vi.mock('openai', () => ({
  default: class {
    responses = { create: mocks.create }
  },
  APIConnectionError: class extends Error {},
  APIError: class extends Error {}
}))

let db: Database

beforeEach(async () => {
  db = await createTestDb()
  mocks.create.mockClear()
})

describe('chat.summarize', () => {
  it('stores an empty summary without calling the model', async () => {
    const response = await callRpcRaw(db, 'chat/summarize', { period: 'day', timezone: 'UTC' })
    const rows = await db.select().from(chatMessage)
    const assistant = rows.find((row) => row.role === 'assistant')

    expect(response.status).toBe(200)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      role: 'user',
      kind: 'summary',
      period: 'day',
      content: 'Summarize today'
    })
    if (!assistant) throw new Error('missing assistant message')
    expect(assistant).toMatchObject({ kind: 'summary', period: 'day', status: 'completed' })
    expect(assistant.content).toContain('Nothing logged')
    expect(mocks.create).not.toHaveBeenCalled()

    const thinking = await db
      .select()
      .from(chatThinking)
      .where(eq(chatThinking.messageId, assistant.id))
    const data = thinking.find((row) => row.kind === 'tool_result')

    if (!data) throw new Error('missing gather data')
    expect(JSON.parse(data.content).counts.notes).toBe(0)
  })

  it('writes a summary when the period has records', async () => {
    await db.insert(chat).values({ id: 'chat-1', userId: TEST_USER_ID })
    await db.insert(chatMessage).values({
      id: 'message-1',
      chatId: 'chat-1',
      role: 'user',
      content: 'seed'
    })
    await db.insert(journalEntry).values({
      id: 'note-1',
      userId: TEST_USER_ID,
      content: 'Shipped the migration and watched the dashboards.',
      tags: '[]',
      occurredAt: new Date()
    })
    await db.insert(expense).values({
      id: 'expense-1',
      userId: TEST_USER_ID,
      messageId: 'message-1',
      title: 'Coffee',
      description: '',
      amountCents: 1200,
      currency: 'USD',
      category: 'food',
      occurredAt: new Date()
    })

    const response = await callRpcRaw(db, 'chat/summarize', { period: 'day', timezone: 'UTC' })
    const rows = await db.select().from(chatMessage)
    const assistant = rows.find((row) => row.role === 'assistant')

    const phases = response.text
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map(
        (line) =>
          JSON.parse(line.slice(6)) as { json?: { type: string; phase: string; status: string } }
      )
      .flatMap((event) => (event.json?.type === 'phase' ? [event.json] : []))

    expect(response.status).toBe(200)
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(phases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ phase: 'write', status: 'running' }),
        expect.objectContaining({ phase: 'write', status: 'completed' })
      ])
    )
    if (!assistant) throw new Error('missing assistant message')
    expect(assistant.status).toBe('completed')
    expect(assistant.content).toContain('## Highlights')
    expect(assistant.rangeStart).not.toBeNull()
    expect(assistant.rangeEnd).not.toBeNull()

    const thinking = await db
      .select()
      .from(chatThinking)
      .where(eq(chatThinking.messageId, assistant.id))
    const data = thinking.find((row) => row.kind === 'tool_result')

    if (!data) throw new Error('missing gather data')
    expect(data.content).toContain('Shipped the migration')
    const payload = JSON.parse(data.content) as {
      counts: { notes: number }
      totals: Array<{
        currency: string
        totalCents: number
        categories: Array<{ category: string }>
      }>
    }

    expect(payload.counts.notes).toBe(1)
    expect(payload.totals[0]).toMatchObject({ currency: 'USD', totalCents: 1200 })
    expect(payload.totals[0]?.categories).toContainEqual({ category: 'food', totalCents: 1200 })
  })

  it('exposes summary metadata in the chat list', async () => {
    await callRpcRaw(db, 'chat/summarize', { period: 'week', timezone: 'UTC' })

    const response = await callRpc(db, 'chat/list')
    const list = (response.body as { json: Array<ChatMessage> }).json

    expect(list).toHaveLength(2)
    expect(list[0]).toMatchObject({ kind: 'summary', period: 'week' })
    expect(list[0]?.from).toEqual(expect.any(String))
    expect(list[0]?.to).toEqual(expect.any(String))
  })

  it('rejects an unknown period', async () => {
    const response = await callRpcRaw(db, 'chat/summarize', { period: 'fortnight' })

    expect(response.status).toBe(400)
  })
})
