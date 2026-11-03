import type OpenAI from 'openai'

import {
  META_CHAT_MAX_TOKENS,
  META_CHAT_MODEL,
  META_LONG_OUTPUT_TOKENS
} from '@tars/core/constants'

export type ParseResult<T> = { ok: true; result: T } | { ok: false; issues: string; output: string }

export type ModelContent =
  { type: 'input_text'; text: string } | { type: 'input_image'; image_url: string; detail: 'auto' }

export type ModelInput =
  string | Array<{ type: 'message'; role: 'user'; content: Array<ModelContent> }>

export type StructuredRepair = (issues: string, input: string, output: string) => string

const GENERIC_REPAIR: StructuredRepair = (issues) => `Your previous output failed schema validation.

Errors:
${issues}

Fix only the listed fields and return the JSON object again. No prose, no code fences.`

type ModelCall = {
  instructions: string
  input: ModelInput
  format?: { name: string; schema: Record<string, unknown> }
  maxOutputTokens?: number
}

type ModelResult = { text: string; incomplete: boolean }

const CONTINUE_INSTRUCTIONS = `Your previous answer was cut off by the output limit. Continue the document from exactly where it stops. Return only the continuation: no repetition, no repeated heading, no commentary.`

async function callModel(openAi: OpenAI, options: ModelCall): Promise<ModelResult> {
  const response = await openAi.responses.create(
    {
      model: META_CHAT_MODEL,
      instructions: options.instructions,
      input: options.input as never,
      ...(options.format
        ? {
            text: {
              format: {
                type: 'json_schema',
                name: options.format.name,
                strict: true,
                schema: options.format.schema
              }
            }
          }
        : {}),
      max_output_tokens: options.maxOutputTokens ?? META_CHAT_MAX_TOKENS
    },
    { maxRetries: 2 }
  )

  const result = response as { output_text: string; status?: string }

  return {
    text: result.output_text,
    incomplete: result.status === 'incomplete'
  }
}

async function continueText(
  openAi: OpenAI,
  options: { instructions: string; input: ModelInput },
  first: string,
  maxOutputTokens: number
): Promise<string> {
  let text = first

  for (let round = 0; round < 2; round += 1) {
    const result = await callModel(openAi, {
      instructions: `${options.instructions}\n\n${CONTINUE_INSTRUCTIONS}`,
      input: `Continue this text exactly where it ends:\n\n${text.slice(-2_000)}`,
      maxOutputTokens
    })

    text += result.text

    if (!result.incomplete) return text.trim()
  }

  throw new Error('Model output was truncated')
}

export async function runText(
  openAi: OpenAI,
  options: { instructions: string; input: ModelInput; maxOutputTokens?: number }
): Promise<string> {
  const maxOutputTokens = options.maxOutputTokens ?? META_LONG_OUTPUT_TOKENS

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await callModel(openAi, { ...options, maxOutputTokens })

    if (result.incomplete) return continueText(openAi, options, result.text, maxOutputTokens)

    const text = result.text.trim()

    if (text) return text
  }

  throw new Error('Empty model response')
}

export async function runStructured<T>(
  openAi: OpenAI,
  options: {
    name: string
    schema: Record<string, unknown>
    instructions: string
    input: ModelInput
    parse: (text: string) => ParseResult<T>
    repair?: StructuredRepair
  }
): Promise<T> {
  const call = (input: ModelInput): Promise<ModelResult> =>
    callModel(openAi, {
      instructions: options.instructions,
      input,
      format: { name: options.name, schema: options.schema },
      maxOutputTokens: META_LONG_OUTPUT_TOKENS
    })

  const first = await call(options.input)

  if (first.incomplete) throw new Error('Model output was truncated')

  const parsed = options.parse(first.text)

  if (parsed.ok) return parsed.result

  const repair = options.repair ?? GENERIC_REPAIR
  const repaired = await call(
    repair(
      parsed.issues,
      typeof options.input === 'string' ? options.input : options.instructions,
      parsed.output
    )
  )
  if (repaired.incomplete) throw new Error('Model output was truncated')

  const retry = options.parse(repaired.text)

  if (retry.ok) return retry.result

  throw new Error(retry.issues)
}
