import { base } from './context'
import { chatRouter } from './routes/chat'
import { expensesRouter } from './routes/expenses'
import { journalRouter } from './routes/journal'
import { voiceRouter } from './routes/voice'

export const router = base.router({
  chat: chatRouter,
  expenses: expensesRouter,
  journal: journalRouter,
  voice: voiceRouter
})

export type Router = typeof router
