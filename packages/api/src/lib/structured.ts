import type OpenAI from 'openai'

import { META_CHAT_MAX_TOKENS, META_CHAT_MODEL } from '@tars/core/constants'

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
}

async function callModel(openAi: OpenAI, options: ModelCall): Promise<string> {
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
      max_output_tokens: META_CHAT_MAX_TOKENS
    },
    { maxRetries: 2 }
  )

  return response.output_text
}

export async function runText(
  openAi: OpenAI,
  options: { instructions: string; input: ModelInput }
): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const text = (await callModel(openAi, options)).trim()

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
  const call = (input: ModelInput): Promise<string> =>
    callModel(openAi, {
      instructions: options.instructions,
      input,
      format: { name: options.name, schema: options.schema }
    })

  const first = await call(options.input)
  const parsed = options.parse(first)

  if (parsed.ok) return parsed.result

  const repair = options.repair ?? GENERIC_REPAIR
  const repaired = await call(
    repair(
      parsed.issues,
      typeof options.input === 'string' ? options.input : options.instructions,
      parsed.output
    )
  )
  const retry = options.parse(repaired)

  if (retry.ok) return retry.result

  throw new Error(retry.issues)
}
