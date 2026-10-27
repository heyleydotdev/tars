import { os } from '@orpc/server'

export const router = os.router({
  time: os.handler(() => ({ iso: new Date().toISOString() }))
})

export type Router = typeof router
