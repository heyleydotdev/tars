import * as z from 'zod'

export const usageModelSchema = z.object({
  model: z.string().min(1),
  calls: z.number().int().nonnegative(),
  costMicros: z.number().int().nonnegative()
})

export const usageEventSchema = z.object({
  id: z.string().min(1),
  feature: z.string().min(1),
  model: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costMicros: z.number().int().nonnegative(),
  createdAt: z.string()
})

export const usageSummarySchema = z.object({
  limitMicros: z.number().int().nonnegative(),
  spentMicros: z.number().int().nonnegative(),
  remainingMicros: z.number().int().nonnegative(),
  calls: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  models: z.array(usageModelSchema),
  events: z.array(usageEventSchema)
})

export type UsageModelInput = z.input<typeof usageModelSchema>
export type UsageModelOutput = z.output<typeof usageModelSchema>
export type UsageEventInput = z.input<typeof usageEventSchema>
export type UsageEventOutput = z.output<typeof usageEventSchema>
export type UsageSummaryInput = z.input<typeof usageSummarySchema>
export type UsageSummaryOutput = z.output<typeof usageSummarySchema>
