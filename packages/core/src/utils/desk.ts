import type { ChatPhaseOutput, DeskResultOutput } from '../schemas/chat'
import { chatPhaseSchema, deskResultSchema } from '../schemas/chat'

type DeskParseResult =
  { ok: true; result: DeskResultOutput } | { ok: false; issues: string; output: string }

export function hasDeskChanges(result: DeskResultOutput): boolean {
  return (
    result.todos.length > 0 ||
    result.reminders.length > 0 ||
    result.expenses.length > 0 ||
    result.journals.length > 0 ||
    result.deletions.length > 0
  )
}

export function parseDeskOutput(text: string): DeskParseResult {
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

  const parsed = deskResultSchema.safeParse(output)

  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join('\n'),
      output: text
    }
  }

  if (parsed.data.clarification && hasDeskChanges(parsed.data)) {
    return {
      ok: false,
      issues: 'clarification must have empty records and deletions',
      output: text
    }
  }

  return { ok: true, result: parsed.data }
}

export function parseChatPhase(content: string): ChatPhaseOutput | null {
  try {
    const parsed = chatPhaseSchema.safeParse(JSON.parse(content))

    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
