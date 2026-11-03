import type OpenAI from 'openai'
import { describe, expect, it } from 'vitest'

import { runStructured, runText } from '../../src/lib/structured'

type Call = { instructions: string; input: unknown }

type FakeResponse = string | { text: string; status: 'completed' | 'incomplete' }

function fakeOpenAi(responses: Array<FakeResponse>) {
  const calls: Array<Call> = []
  const openAi = {
    responses: {
      create: async (body: Call) => {
        calls.push({ instructions: body.instructions, input: body.input })

        const response = responses[calls.length - 1] ?? ''

        return typeof response === 'string'
          ? { output_text: response, status: 'completed' }
          : { output_text: response.text, status: response.status }
      }
    }
  } as unknown as OpenAI

  return { openAi, calls }
}

function parse(text: string) {
  try {
    const value = JSON.parse(text) as { ok?: boolean }

    return value.ok === true
      ? { ok: true as const, result: value }
      : { ok: false as const, issues: 'not ok', output: text }
  } catch {
    return { ok: false as const, issues: 'invalid json', output: text }
  }
}

const base = {
  name: 'test',
  schema: { type: 'object' },
  instructions: 'base instructions',
  input: 'go',
  parse
}

describe('runStructured', () => {
  it('retries once with the repair prompt', async () => {
    const { openAi, calls } = fakeOpenAi(['not json', '{"ok":true}'])
    const result = await runStructured(openAi, {
      ...base,
      repair: (issues) => `REPAIR: ${issues}`
    })

    expect(result).toEqual({ ok: true })
    expect(calls).toHaveLength(2)
    expect(calls[1]?.input).toBe('REPAIR: invalid json')
    expect(calls[1]?.instructions).toBe('base instructions')
  })

  it('throws when the output is truncated', async () => {
    const { openAi } = fakeOpenAi([{ text: '{"ok":', status: 'incomplete' }])

    await expect(runStructured(openAi, base)).rejects.toThrow('truncated')
  })

  it('throws when the repair also fails', async () => {
    const { openAi } = fakeOpenAi(['not json', 'still not json'])

    await expect(runStructured(openAi, base)).rejects.toThrow('invalid json')
  })
})

describe('runText', () => {
  it('continues a truncated answer', async () => {
    const { openAi, calls } = fakeOpenAi([
      { text: 'Part one.', status: 'incomplete' },
      { text: ' Part two.', status: 'completed' }
    ])

    await expect(runText(openAi, { instructions: 'base', input: 'go' })).resolves.toBe(
      'Part one. Part two.'
    )
    expect(calls).toHaveLength(2)
  })

  it('throws when continuation is still truncated', async () => {
    const { openAi } = fakeOpenAi([
      { text: 'one', status: 'incomplete' },
      { text: 'two', status: 'incomplete' },
      { text: 'three', status: 'incomplete' }
    ])

    await expect(runText(openAi, { instructions: 'base', input: 'go' })).rejects.toThrow(
      'truncated'
    )
  })
  it('returns trimmed text', async () => {
    const { openAi } = fakeOpenAi(['  # Proposal  '])

    await expect(runText(openAi, { instructions: 'base', input: 'go' })).resolves.toBe('# Proposal')
  })

  it('retries once when the model returns nothing', async () => {
    const { openAi, calls } = fakeOpenAi(['', '# Proposal'])

    await expect(runText(openAi, { instructions: 'base', input: 'go' })).resolves.toBe('# Proposal')
    expect(calls).toHaveLength(2)
  })

  it('throws when both attempts are empty', async () => {
    const { openAi } = fakeOpenAi(['', ''])

    await expect(runText(openAi, { instructions: 'base', input: 'go' })).rejects.toThrow(
      'Empty model response'
    )
  })
})
