import { ORPCError } from '@orpc/server'
import { decodeBase64url } from '@orpc/server/helpers'

import { ERRORS } from '@tars/core/errors'
import { transcribeSchema } from '@tars/core/schemas/voice'

import { base, protectedProcedure } from './context'

export const router = base.router({
  me: protectedProcedure.handler(({ context }) => ({
    id: context.session.user.id,
    name: context.session.user.name
  })),
  time: base.handler(() => ({ iso: new Date().toISOString() })),
  voice: {
    transcribe: base.input(transcribeSchema).handler(async ({ input, context }) => {
      const audio = decodeBase64url(input.audio)

      if (!audio) {
        throw new ORPCError('BAD_REQUEST', { message: ERRORS.invalidBase64 })
      }

      return { text: await context.transcribe(audio) }
    })
  }
})

export type Router = typeof router
