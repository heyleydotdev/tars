import {
  DEFAULT_USAGE_CAP_MICROS,
  META_CHAT_PRICE_INPUT_MICROS_PER_MILLION,
  META_CHAT_PRICE_OUTPUT_MICROS_PER_MILLION,
  META_SAM_MODEL,
  META_SAM_PRICE_MICROS
} from '../constants'

export function usageCostMicros(model: string, inputTokens: number, outputTokens: number): number {
  if (model === META_SAM_MODEL) return META_SAM_PRICE_MICROS

  return Math.round(
    (inputTokens * META_CHAT_PRICE_INPUT_MICROS_PER_MILLION +
      outputTokens * META_CHAT_PRICE_OUTPUT_MICROS_PER_MILLION) /
      1_000_000
  )
}

export function usageLimitMicros(value: string | undefined): number {
  const usd = Number(value)

  return Number.isFinite(usd) && usd >= 0 ? Math.round(usd * 1_000_000) : DEFAULT_USAGE_CAP_MICROS
}
