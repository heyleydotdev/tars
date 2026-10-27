import { ORPCError, os } from '@orpc/server'

import type { Session } from '@tars/auth/server'

export type RpcServerContext = {
  getSession: () => Promise<Session | null>
}

export const base = os.$context<RpcServerContext>()

export const requireSession = base.middleware(async ({ context, next }) => {
  const session = await context.getSession()

  if (!session) {
    throw new ORPCError('UNAUTHORIZED')
  }

  return next({ context: { session } })
})

export const protectedProcedure = base.use(requireSession)
