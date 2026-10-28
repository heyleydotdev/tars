import { base } from './context'
import { voiceRouter } from './routes/voice'

export const router = base.router({
  voice: voiceRouter
})

export type Router = typeof router
