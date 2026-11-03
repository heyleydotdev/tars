import * as z from 'zod'

import { UI_REVIEW_FINDING_LIMIT } from '../constants'
import { uiFindingSeveritySchema, uiPlatformSchema } from './ui-review'

export const uiExplainFindingSchema = z.object({
  label: z.string().min(1).max(80),
  description: z.string().min(1).max(300),
  severity: uiFindingSeveritySchema,
  redesignHint: z.string().min(1).max(300)
})

export const uiExplainSchema = z.object({
  summary: z.string().min(1).max(600),
  platform: uiPlatformSchema,
  findings: z.array(uiExplainFindingSchema).max(UI_REVIEW_FINDING_LIMIT)
})

export const uiExplainJsonSchema = z.toJSONSchema(uiExplainSchema, { target: 'draft-7' })

export type UiExplainFindingInput = z.input<typeof uiExplainFindingSchema>
export type UiExplainFindingOutput = z.output<typeof uiExplainFindingSchema>
export type UiExplainInput = z.input<typeof uiExplainSchema>
export type UiExplainOutput = z.output<typeof uiExplainSchema>
