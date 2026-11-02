import { describe, expect, it } from 'vitest'

import {
  buildIncidentQuestionsPrompt,
  buildIncidentReadinessPrompt
} from '../../src/prompts/incident'

const answers = [{ question: 'Was a flag changed at 14:30?', answer: 'No flag or config changed.' }]

describe('answered facts', () => {
  it('includes answered facts in the readiness prompt', () => {
    const prompt = buildIncidentReadinessPrompt({ events: [], answers })

    expect(prompt).toContain('Answered facts')
    expect(prompt).toContain('Q: Was a flag changed at 14:30?')
    expect(prompt).toContain('A: No flag or config changed.')
  })

  it('omits the section when nothing was answered', () => {
    expect(buildIncidentReadinessPrompt({ events: [] })).not.toContain('Answered facts')
  })

  it('includes answered facts when drafting questions', () => {
    const prompt = buildIncidentQuestionsPrompt({
      events: [],
      gaps: ['whether a flag changed'],
      answers
    })

    expect(prompt).toContain('Answered facts')
    expect(prompt).toContain('A: No flag or config changed.')
  })
})
