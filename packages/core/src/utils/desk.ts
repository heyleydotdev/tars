import type { ChatPhaseOutput, DeskResultOutput } from '../schemas/chat'
import { chatPhaseSchema, deskResultSchema } from '../schemas/chat'

type DeskParseResult =
  { ok: true; result: DeskResultOutput } | { ok: false; issues: string; output: string }

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

  return { ok: true, result: parsed.data }
}

export function needsDeskReview(message: string, result: DeskResultOutput): boolean {
  const count =
    result.todos.length + result.reminders.length + result.expenses.length + result.journals.length

  if (count === 0) return false
  if (count > 1) return true
  if (result.reminders.length > 0 || result.expenses.length > 0) return true

  return /\b(tomorrow|today|tonight|yesterday|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|remind|spent|paid|bought|\$|₹|€|£)/i.test(
    message
  )
}

export function parseChatPhase(content: string): ChatPhaseOutput | null {
  try {
    const parsed = chatPhaseSchema.safeParse(JSON.parse(content))

    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
