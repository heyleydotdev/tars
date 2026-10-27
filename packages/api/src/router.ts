import { base, protectedProcedure } from './context'

export const router = base.router({
  me: protectedProcedure.handler(({ context }) => ({
    id: context.session.user.id,
    name: context.session.user.name
  })),
  time: base.handler(() => ({ iso: new Date().toISOString() }))
})

export type Router = typeof router
