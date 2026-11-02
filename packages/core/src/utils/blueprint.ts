import type { BlueprintFlowOutput, BlueprintHierarchyOutput } from '../schemas/blueprint'
import type {
  BlueprintExtractionOutput,
  BlueprintQuestionsOutput,
  BlueprintReadinessOutput
} from '../schemas/blueprint-ai'
import type { Parsed } from './structured'
import { blueprintFlowSchema, blueprintHierarchySchema } from '../schemas/blueprint'
import {
  blueprintExtractionSchema,
  blueprintQuestionsSchema,
  blueprintReadinessSchema
} from '../schemas/blueprint-ai'
import { parseStructured } from './structured'

export function parseBlueprintExtraction(text: string): Parsed<BlueprintExtractionOutput> {
  return parseStructured(blueprintExtractionSchema, text)
}

export function parseBlueprintHierarchy(text: string): Parsed<BlueprintHierarchyOutput> {
  return parseStructured(blueprintHierarchySchema, text)
}

export function parseBlueprintFlow(text: string): Parsed<BlueprintFlowOutput> {
  return parseStructured(blueprintFlowSchema, text)
}

export function parseBlueprintReadiness(text: string): Parsed<BlueprintReadinessOutput> {
  return parseStructured(blueprintReadinessSchema, text)
}

export function parseBlueprintQuestions(text: string): Parsed<BlueprintQuestionsOutput> {
  return parseStructured(blueprintQuestionsSchema, text)
}
