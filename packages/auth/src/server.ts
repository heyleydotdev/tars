import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { type Database } from '@tars/db/client'

export type AuthEnv = {
  db: Database
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
}

export function createAuth(env: AuthEnv) {
  return betterAuth({
    database: drizzleAdapter(env.db, { provider: 'sqlite' }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true }
  })
}

export type Auth = ReturnType<typeof createAuth>
