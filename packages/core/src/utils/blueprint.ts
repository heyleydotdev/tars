import type {
  BlueprintDraftOutput,
  BlueprintExtractionOutput,
  BlueprintQuestionsOutput,
  BlueprintReadinessOutput
} from '../schemas/blueprint-ai'
import type { Parsed } from './structured'
import {
  blueprintDraftSchema,
  blueprintExtractionSchema,
  blueprintQuestionsSchema,
  blueprintReadinessSchema
} from '../schemas/blueprint-ai'
import { parseStructured } from './structured'

export function parseBlueprintExtraction(text: string): Parsed<BlueprintExtractionOutput> {
  return parseStructured(blueprintExtractionSchema, text)
}

export function parseBlueprintReadiness(text: string): Parsed<BlueprintReadinessOutput> {
  return parseStructured(blueprintReadinessSchema, text)
}

export function parseBlueprintQuestions(text: string): Parsed<BlueprintQuestionsOutput> {
  return parseStructured(blueprintQuestionsSchema, text)
}

export function parseBlueprintDraft(text: string): Parsed<BlueprintDraftOutput> {
  return parseStructured(blueprintDraftSchema, text)
}
