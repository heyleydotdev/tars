import { ORPCError, os } from '@orpc/server'

import type { Auth } from '@tars/auth/server'
import type { Database } from '@tars/db/client'

export type RpcServerContext = {
  db: Database
  auth: Auth
  headers: Headers
  metaAiApiKey: string
}

export const base = os.$context<RpcServerContext>()

export const protectedProcedure = base.use(
  base.middleware(async ({ context, next }) => {
    const session = await context.auth.api.getSession({ headers: context.headers })

    if (!session) {
      throw new ORPCError('UNAUTHORIZED')
    }

    return next({ context: { session } })
  })
)
