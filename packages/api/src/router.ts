import { base } from './context'
import { chatRouter } from './routes/chat'
import { journalRouter } from './routes/journal'
import { voiceRouter } from './routes/voice'

export const router = base.router({
  chat: chatRouter,
  journal: journalRouter,
  voice: voiceRouter
})

export type Router = typeof router
