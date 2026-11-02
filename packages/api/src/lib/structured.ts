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
  const call = async (input: ModelInput): Promise<string> => {
    const response = await openAi.responses.create(
      {
        model: META_CHAT_MODEL,
        instructions: options.instructions,
        input: input as never,
        text: {
          format: {
            type: 'json_schema',
            name: options.name,
            strict: true,
            schema: options.schema
          }
        },
        max_output_tokens: META_CHAT_MAX_TOKENS
      },
      { maxRetries: 2 }
    )

    return response.output_text
  }

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
