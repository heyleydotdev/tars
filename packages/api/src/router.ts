import { base } from './context'
import { chatRouter } from './routes/chat'
import { voiceRouter } from './routes/voice'

export const router = base.router({
  chat: chatRouter,
  voice: voiceRouter
})

export type Router = typeof router
