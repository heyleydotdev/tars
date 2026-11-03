import { beforeEach, describe, expect, it } from 'vitest'

import type { Database } from '@tars/db/client'
import { loadDeskContextRecords } from '@tars/core/services/records'
import { chat, chatMessage, todo } from '@tars/db/schema'

import { createTestDb, TEST_USER_ID } from '../helpers/rpc'

let db: Database

beforeEach(async () => {
  db = await createTestDb()
})

async function seedMessage(): Promise<void> {
  await db.insert(chat).values({ id: 'chat-1', userId: TEST_USER_ID })
  await db.insert(chatMessage).values({
    id: 'message-1',
    chatId: 'chat-1',
    role: 'assistant',
    content: ''
  })
}

describe('loadDeskContextRecords', () => {
  it('includes records added by hand, which have no message', async () => {
    await seedMessage()
    await db.insert(todo).values([
      { id: 'todo-message', userId: TEST_USER_ID, messageId: 'message-1', title: 'From chat' },
      { id: 'todo-manual', userId: TEST_USER_ID, messageId: null, title: 'By hand' }
    ])

    const records = await loadDeskContextRecords(db, TEST_USER_ID, ['message-1'])

    expect(records.map((record) => record.id).sort()).toEqual(['todo-manual', 'todo-message'])
  })

  it('still returns manual records when the chat has no messages', async () => {
    await db
      .insert(todo)
      .values({ id: 'todo-manual', userId: TEST_USER_ID, messageId: null, title: 'By hand' })

    const records = await loadDeskContextRecords(db, TEST_USER_ID, [])

    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ type: 'todo', id: 'todo-manual', title: 'By hand' })
  })
})
