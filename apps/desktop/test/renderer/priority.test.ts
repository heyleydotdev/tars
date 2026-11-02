import { describe, expect, it } from 'vitest'

import { deskResultSchema } from '@tars/core/schemas/chat'

function result(todo: Record<string, unknown>) {
  return {
    reply: 'Saved.',
    clarification: false,
    todos: [todo],
    reminders: [],
    expenses: [],
    journals: [],
    deletions: []
  }
}

describe('task priority deprecation', () => {
  it('accepts a todo without priority', () => {
    expect(
      deskResultSchema.safeParse(
        result({ id: null, title: 'Ship it', done: false, notes: null, dueAt: null })
      ).success
    ).toBe(true)
  })

  it('rejects a todo that still includes priority', () => {
    expect(
      deskResultSchema.safeParse(
        result({
          id: null,
          title: 'Ship it',
          done: false,
          notes: null,
          dueAt: null,
          priority: 'high'
        })
      ).success
    ).toBe(false)
  })
})
