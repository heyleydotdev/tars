import { describe, expect, it } from 'bun:test'

import type { SavedRecordOutput } from '@tars/core/schemas/chat'

import { deskResultMarkdown } from '../../src/renderer/src/lib/desk'

function todo(overrides: Partial<Extract<SavedRecordOutput, { type: 'todo' }>> = {}) {
  return {
    type: 'todo',
    id: 'todo-1',
    title: 'Ship the fix',
    done: false,
    dueAt: null,
    priority: null,
    ...overrides
  } satisfies SavedRecordOutput
}

describe('deskResultMarkdown', () => {
  it('returns the reply untouched when nothing was saved', () => {
    expect(deskResultMarkdown('All set.', [])).toBe('All set.')
  })

  it('lists saved records before the reply', () => {
    const result = deskResultMarkdown('Done.', [todo()])
    const recordLine = result.indexOf('Ship the fix')
    const reply = result.indexOf('Done.')

    expect(recordLine).toBeGreaterThanOrEqual(0)
    expect(recordLine).toBeLessThan(reply)
    expect(result).toContain('\n\nDone.')
  })

  it('falls back to a confirmation when the reply is empty', () => {
    expect(deskResultMarkdown('', [todo()])).toContain('Saved to Desk.')
  })

  it('escapes markdown characters in record titles', () => {
    const result = deskResultMarkdown('Saved.', [todo({ title: 'Deploy [hotfix] (v2) *now*' })])

    expect(result).toContain('Deploy \\[hotfix\\] \\(v2\\) \\*now\\*')
  })

  it('describes task state in priority order', () => {
    expect(deskResultMarkdown('', [todo({ done: true })])).toContain('todo · done')
    expect(deskResultMarkdown('', [todo({ priority: 'high' })])).toContain('high priority')
    expect(deskResultMarkdown('', [todo({ dueAt: '2026-11-02T09:00:00.000Z' })])).not.toContain(
      'priority'
    )
  })

  it('renders one line per saved record kind', () => {
    const records: Array<SavedRecordOutput> = [
      {
        type: 'reminder',
        id: 'reminder-1',
        title: 'Call the bank',
        remindAt: '2026-11-02T09:00:00.000Z'
      },
      {
        type: 'expense',
        id: 'expense-1',
        title: 'Coffee',
        description: '',
        amountCents: 450,
        currency: 'USD',
        category: 'food'
      },
      {
        type: 'journal',
        id: 'journal-1',
        title: 'Standup',
        content: 'Shipped the fix.',
        mood: 'calm'
      }
    ]

    const result = deskResultMarkdown('Saved.', records)

    expect(result).toContain('**Call the bank** — reminder ·')
    expect(result).toContain('**Coffee** — expense ·')
    expect(result).toContain('**Standup** — journal · calm')
    expect(result.split('\n').filter((line) => line.startsWith('- '))).toHaveLength(3)
  })

  it('escapes the journal mood', () => {
    const result = deskResultMarkdown('', [
      {
        type: 'journal',
        id: 'journal-1',
        title: 'Standup',
        content: 'Shipped the fix.',
        mood: '*calm*'
      }
    ])

    expect(result).toContain('journal · \\*calm\\*')
  })
})
