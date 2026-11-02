import type { ZodType } from 'zod'

export type Parsed<T> = { ok: true; result: T } | { ok: false; issues: string; output: string }

export function parseStructured<T>(schema: ZodType<T>, text: string): Parsed<T> {
  let output: unknown

  try {
    output = JSON.parse(text)
  } catch (error) {
    return {
      ok: false,
      issues: `Invalid JSON: ${error instanceof Error ? error.message : 'unknown'}`,
      output: text
    }
  }

  const parsed = schema.safeParse(output)

  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join('\n'),
      output: text
    }
  }

  return { ok: true, result: parsed.data }
}
