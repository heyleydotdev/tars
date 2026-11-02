import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { QuestionKind } from '@tars/core/schemas/question'

import QuestionField from '../../src/renderer/src/components/question-field'

const question: {
  text: string
  rationale: string
  kind: QuestionKind
  options: Array<string> | null
} = {
  text: 'Which site hosts the booking form?',
  rationale: 'Changes the task list.',
  kind: 'short',
  options: null
}

function render(next: Partial<typeof question>): string {
  return renderToStaticMarkup(
    createElement(QuestionField, {
      question: { ...question, ...next },
      value: '',
      pending: false,
      onChange: () => undefined,
      onSubmit: () => undefined
    })
  )
}

describe('QuestionField', () => {
  it('renders a date input for date questions', () => {
    expect(render({ kind: 'date' })).toContain('type="date"')
  })

  it('renders a textarea for long questions', () => {
    expect(render({ kind: 'long' })).toContain('<textarea')
  })

  it('renders a text input for short questions', () => {
    expect(render({ kind: 'short' })).toContain('type="text"')
  })

  it('renders a select for select questions', () => {
    const html = render({ kind: 'select', options: ['Existing site', 'New site'] })

    expect(html).toContain('Choose an answer')
  })

  it('falls back to text when a select has no options', () => {
    expect(render({ kind: 'select', options: null })).toContain('type="text"')
    expect(render({ kind: 'select', options: [] })).toContain('type="text"')
  })
})
