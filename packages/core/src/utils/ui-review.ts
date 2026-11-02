import type { UiExplainOutput, UiPromptOutput } from '../schemas/ui-review-ai'
import type { Parsed } from './structured'
import { uiExplainSchema, uiPromptSchema } from '../schemas/ui-review-ai'
import { parseStructured } from './structured'

export function parseUiExplain(text: string): Parsed<UiExplainOutput> {
  return parseStructured(uiExplainSchema, text)
}

export function parseUiPrompt(text: string): Parsed<UiPromptOutput> {
  return parseStructured(uiPromptSchema, text)
}
