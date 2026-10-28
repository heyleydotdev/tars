import type { RequestHeadersHandlerPluginContext } from '@orpc/server/plugins'
import { ORPCError, os } from '@orpc/server'
import OpenAIClient from 'openai'

import type { Auth } from '@tars/auth/server'
import type { Database } from '@tars/db/client'
import { META_MODEL_API_URL } from '@tars/core/constants'

export type RpcServerContext = RequestHeadersHandlerPluginContext & {
  db: Database
  auth: Auth
  metaAiApiKey: string
}

export const base = os.$context<RpcServerContext>()

export const openAiMiddleware = base.middleware(async ({ context, next }) =>
  next({
    context: {
      openAi: new OpenAIClient({
        apiKey: context.metaAiApiKey,
        baseURL: META_MODEL_API_URL
      })
    }
  })
)

export const protectedProcedure = base.use(
  base.middleware(async ({ context, next }) => {
    if (!context.reqHeaders) {
      throw new ORPCError('UNAUTHORIZED')
    }

    const session = await context.auth.api.getSession({ headers: context.reqHeaders })

    if (!session) {
      throw new ORPCError('UNAUTHORIZED')
    }

    return next({ context: { session } })
  })
)
