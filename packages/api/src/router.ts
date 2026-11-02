import { base } from './context'
import { blueprintRouter } from './routes/blueprint'
import { chatRouter } from './routes/chat'
import { expensesRouter } from './routes/expenses'
import { incidentRouter } from './routes/incident'
import { journalRouter } from './routes/journal'
import { measureRouter } from './routes/measure'
import { voiceRouter } from './routes/voice'

export const router = base.router({
  blueprint: blueprintRouter,
  chat: chatRouter,
  expenses: expensesRouter,
  incident: incidentRouter,
  journal: journalRouter,
  measure: measureRouter,
  voice: voiceRouter
})

export type Router = typeof router
