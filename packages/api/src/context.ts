import type {
  RequestHeadersHandlerPluginContext,
  ResponseHeadersHandlerPluginContext
} from '@orpc/server/plugins'
import { os } from '@orpc/server'
import OpenAIClient from 'openai'

import type { Auth } from '@tars/auth/server'
import type { FileBucket } from '@tars/core/services/files'
import type { Database } from '@tars/db/client'
import { META_CHAT_MODEL, META_MODEL_API_URL } from '@tars/core/constants'
import { usageCostMicros } from '@tars/core/utils/usage'
import { usageEvent } from '@tars/db/schema'
import { eq, sql } from '@tars/db/sql'

import { UnauthorizedError, UsageLimitError } from './errors'

type RpcServerContext = RequestHeadersHandlerPluginContext &
  ResponseHeadersHandlerPluginContext & {
    db: Database
    auth: Auth
    metaAiApiKey: string
    fileSecret: string
    files: FileBucket
    usageLimitMicros: number
  }

export const base = os.$context<RpcServerContext>()

export type AiFeature = 'blueprint' | 'incident' | 'measure' | 'ui' | 'chat' | 'voice'

export function aiMiddleware(feature: AiFeature) {
  return base.middleware(async ({ context, next }) => {
    const session = (context as unknown as { session?: { user: { id: string } } }).session

    if (!session) {
      throw new UnauthorizedError()
    }

    const userId = session.user.id
    const [spend] = await context.db
      .select({ total: sql<number>`coalesce(sum(${usageEvent.costMicros}), 0)` })
      .from(usageEvent)
      .where(eq(usageEvent.userId, userId))

    if (Number(spend?.total ?? 0) >= context.usageLimitMicros) {
      throw new UsageLimitError()
    }

    const openAi = new OpenAIClient({
      apiKey: context.metaAiApiKey,
      baseURL: META_MODEL_API_URL
    })
    const create = openAi.responses.create.bind(openAi.responses)

    openAi.responses.create = (async (...args: Parameters<typeof create>) => {
      const response = await create(...args)
      const result = response as {
        usage?: { input_tokens: number; output_tokens: number }
        model?: string
      }
      const usage = result.usage
      const model = result.model ?? META_CHAT_MODEL

      if (usage) {
        try {
          await context.db.insert(usageEvent).values({
            id: crypto.randomUUID(),
            userId,
            feature,
            model,
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            costMicros: usageCostMicros(model, usage.input_tokens, usage.output_tokens)
          })
        } catch (error) {
          // The model already answered; losing a usage row must not fail the request.
          console.error('usage record failed', error)
        }
      }

      return response
    }) as typeof openAi.responses.create

    return next({ context: { openAi } })
  })
}

export const protectedProcedure = base.use(
  base.middleware(async ({ context, next }) => {
    if (!context.reqHeaders) {
      throw new UnauthorizedError()
    }

    const session = await context.auth.api.getSession({ headers: context.reqHeaders })

    if (!session) {
      throw new UnauthorizedError()
    }

    return next({ context: { session } })
  })
)
