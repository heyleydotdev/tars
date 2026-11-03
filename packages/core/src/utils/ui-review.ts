import type { UiExplainOutput } from '../schemas/ui-review-ai'
import type { Parsed } from './structured'
import { UI_REVIEW_CODE_LIMIT } from '../constants'
import { uiExplainSchema } from '../schemas/ui-review-ai'
import { parseStructured } from './structured'

export function parseUiExplain(text: string): Parsed<UiExplainOutput> {
  return parseStructured(uiExplainSchema, text)
}

export function sanitizeUiCode(value: string): string {
  const fenced = value.match(/```(?:html)?\s*([\s\S]*?)```/i)
  const code = (fenced?.[1] ?? value).trim()

  return code
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    .slice(0, UI_REVIEW_CODE_LIMIT)
}
