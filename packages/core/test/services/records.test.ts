import { describe, expect, it } from 'vitest'

import { groupRecordsByMessage } from '../../src/services/records'

const reminderAt = new Date('2026-11-04T09:00:00.000Z')

describe('groupRecordsByMessage', () => {
  it('groups records that came from a message and skips manual ones', () => {
    const grouped = groupRecordsByMessage({
      todos: [
        {
          id: 'todo-message',
          messageId: 'message-1',
          title: 'Water plants',
          status: 'open',
          dueAt: null
        },
        { id: 'todo-manual', messageId: null, title: 'Someday', status: 'open', dueAt: null }
      ],
      reminders: [
        { id: 'reminder-manual', messageId: null, title: 'Call the bank', remindAt: reminderAt }
      ],
      expenses: [
        {
          id: 'expense-manual',
          messageId: null,
          title: null,
          description: 'Coffee',
          amountCents: 450,
          currency: 'USD',
          category: 'food'
        }
      ],
      journals: [
        {
          id: 'journal-manual',
          messageId: null,
          title: null,
          content: 'Written by hand',
          mood: null
        }
      ]
    })

    expect([...grouped.keys()]).toEqual(['message-1'])
    expect(grouped.get('message-1')).toEqual([
      { type: 'todo', id: 'todo-message', title: 'Water plants', done: false, dueAt: null }
    ])
  })
})
