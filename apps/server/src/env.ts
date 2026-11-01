import type { Auth, Session } from '@tars/auth/server'
import type { Database } from '@tars/db/client'

export type AppEnv = {
  Bindings: Env
  Variables: {
    db: Database
    auth: Auth
    session: Session | null
  }
}
