import { describe, expect, it } from 'vitest'

import { buildRecordInput } from '../../src/renderer/src/lib/record-create'

const draft = {
  title: '',
  content: '',
  mood: '',
  tags: '',
  at: '2026-11-04T09:30',
  dueAt: ''
}

describe('buildRecordInput', () => {
  it('builds a note, trimming and deduplicating tags', () => {
    const record = buildRecordInput('note', {
      ...draft,
      title: '  Diary ',
      content: ' Long day ',
      mood: ' calm ',
      tags: 'work, work, life'
    })

    expect(record.type).toBe('note')

    if (record.type !== 'note') throw new Error('expected a note')

    expect(record.input).toEqual({
      title: 'Diary',
      content: 'Long day',
      mood: 'calm',
      tags: ['work', 'life'],
      occurredAt: new Date('2026-11-04T09:30').toISOString()
    })
  })

  it('drops an empty note title and mood', () => {
    const record = buildRecordInput('note', { ...draft, content: 'Just text', tags: '  ,  ' })

    if (record.type !== 'note') throw new Error('expected a note')

    expect(record.input.title).toBeNull()
    expect(record.input.mood).toBeNull()
    expect(record.input.tags).toEqual([])
  })

  it('builds a task with an optional due date', () => {
    const dated = buildRecordInput('todo', { ...draft, title: ' Water plants ', dueAt: draft.at })
    const undated = buildRecordInput('todo', { ...draft, title: 'Someday', dueAt: '' })

    if (dated.type !== 'todo' || undated.type !== 'todo') throw new Error('expected tasks')

    expect(dated.input).toEqual({
      title: 'Water plants',
      dueAt: new Date('2026-11-04T09:30').toISOString()
    })
    expect(undated.input.dueAt).toBeNull()
  })

  it('builds a reminder from the same time field', () => {
    const record = buildRecordInput('reminder', { ...draft, title: 'Call the bank' })

    if (record.type !== 'reminder') throw new Error('expected a reminder')

    expect(record.input).toEqual({
      title: 'Call the bank',
      remindAt: new Date('2026-11-04T09:30').toISOString()
    })
  })

  it('rejects a note without content', () => {
    expect(() => buildRecordInput('note', draft)).toThrow('Enter the content.')
  })

  it('rejects a task without a title', () => {
    expect(() => buildRecordInput('todo', { ...draft, title: '   ' })).toThrow('Enter a title.')
  })
})
