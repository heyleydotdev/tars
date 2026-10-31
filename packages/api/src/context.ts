import type {
  RequestHeadersHandlerPluginContext,
  ResponseHeadersHandlerPluginContext
} from '@orpc/server/plugins'
import { os } from '@orpc/server'
import OpenAIClient from 'openai'

import type { Auth } from '@tars/auth/server'
import type { Database } from '@tars/db/client'
import { META_MODEL_API_URL } from '@tars/core/constants'

import { UnauthorizedError } from './errors'

export type MeasureImageBucket = {
  put: (
    key: string,
    value: ArrayBuffer | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } }
  ) => Promise<unknown>
  get: (
    key: string
  ) => Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>
  delete: (key: string | Array<string>) => Promise<void>
}

type RpcServerContext = RequestHeadersHandlerPluginContext &
  ResponseHeadersHandlerPluginContext & {
    db: Database
    auth: Auth
    metaAiApiKey: string
    measureImages: MeasureImageBucket
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
      throw new UnauthorizedError()
    }

    const session = await context.auth.api.getSession({ headers: context.reqHeaders })

    if (!session) {
      throw new UnauthorizedError()
    }

    return next({ context: { session } })
  })
)
