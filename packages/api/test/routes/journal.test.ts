import { beforeEach, describe, expect, it } from 'vitest'

import type { JournalPageOutput } from '@tars/core/schemas/journal'
import type { Database } from '@tars/db/client'
import { journalEntry } from '@tars/db/schema'

import { callRpc, createTestDb, TEST_USER_ID } from '../helpers/rpc'

const at = (day: number, hour: number): string =>
  new Date(Date.UTC(2026, 10, day, hour)).toISOString()

let db: Database

beforeEach(async () => {
  db = await createTestDb()
})

async function insertJournal(id: string, hour: number, tags = '[]', day = 1): Promise<void> {
  await db.insert(journalEntry).values({
    id,
    userId: TEST_USER_ID,
    content: `content ${id}`,
    tags,
    occurredAt: new Date(at(day, hour))
  })
}

function page(body: unknown): JournalPageOutput {
  return (body as { json: JournalPageOutput }).json
}

describe('journal.list', () => {
  it('returns notes, including notes tagged activity, and excludes activity rows', async () => {
    await insertJournal('note-tagged', 10, '["activity"]')
    await insertJournal('note-plain', 9)
    await insertJournal('activity-task-todo-1-2026-11-01', 11, '["activity","task"]')

    const response = await callRpc(db, 'journal/list')

    expect(response.status).toBe(200)
    expect(page(response.body).journals.map((item) => item.id)).toEqual([
      'note-tagged',
      'note-plain'
    ])
  })
})

describe('journal.notes', () => {
  it('returns only notes inside the day range', async () => {
    await insertJournal('note-in', 10)
    await insertJournal('note-out', 10, '[]', 2)
    await insertJournal('activity-task-todo-1-2026-11-01', 11, '["activity","task"]')

    const response = await callRpc(db, 'journal/notes', {
      from: at(1, 0),
      to: at(1, 23)
    })
    const body = response.body as { json: { items: Array<{ id: string }> } }

    expect(body.json.items.map((item) => item.id)).toEqual(['note-in'])
  })
})

describe('journal.activity', () => {
  it('returns only activity rows inside the day range', async () => {
    await insertJournal('note-in', 10)
    await insertJournal('activity-task-todo-1-2026-11-01', 11, '["activity","task"]')
    await insertJournal('activity-measure-run-1', 12, '["activity","measure"]')

    const response = await callRpc(db, 'journal/activity', {
      from: at(1, 0),
      to: at(1, 23)
    })
    const body = response.body as { json: { items: Array<{ id: string }> } }

    expect(body.json.items.map((item) => item.id)).toEqual([
      'activity-measure-run-1',
      'activity-task-todo-1-2026-11-01'
    ])
  })
})

describe('journal.logActivity', () => {
  it('writes one row per event id and ignores duplicates', async () => {
    const event = {
      type: 'task.done',
      todoId: 'todo-1',
      title: 'Pay rent',
      dayKey: '2026-11-01',
      occurredAt: at(1, 12)
    }

    expect((await callRpc(db, 'journal/logActivity', { events: [event] })).status).toBe(200)
    expect((await callRpc(db, 'journal/logActivity', { events: [event] })).status).toBe(200)

    const rows = await db.select().from(journalEntry)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: 'activity-task-todo-1-2026-11-01',
      title: 'Task completed',
      content: 'Pay rent',
      tags: '["activity","task"]'
    })
  })
})

describe('journal.removeTaskActivity', () => {
  it('deletes the latest row for that todo only', async () => {
    await db.insert(journalEntry).values([
      {
        id: 'activity-task-todo-1-2026-10-31',
        userId: TEST_USER_ID,
        content: 'older',
        tags: '["activity","task"]',
        occurredAt: new Date(at(1, 9))
      },
      {
        id: 'activity-task-todo-1-2026-11-01',
        userId: TEST_USER_ID,
        content: 'latest',
        tags: '["activity","task"]',
        occurredAt: new Date(at(1, 12))
      },
      {
        id: 'activity-task-todo-2-2026-11-01',
        userId: TEST_USER_ID,
        content: 'other todo',
        tags: '["activity","task"]',
        occurredAt: new Date(at(1, 10))
      }
    ])

    expect((await callRpc(db, 'journal/removeTaskActivity', { todoId: 'todo-1' })).status).toBe(200)

    const rows = await db.select({ id: journalEntry.id }).from(journalEntry)

    expect(rows.map((row) => row.id).sort()).toEqual([
      'activity-task-todo-1-2026-10-31',
      'activity-task-todo-2-2026-11-01'
    ])
  })
})
