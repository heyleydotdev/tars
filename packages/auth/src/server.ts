import { electron } from '@better-auth/electron'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'

import { type Database } from '@tars/db/client'

export type AuthEnv = {
  db: Database
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  BETTER_AUTH_TRUSTED_ORIGINS: string
}

export function createAuth(env: AuthEnv) {
  return betterAuth({
    database: drizzleAdapter(env.db, { provider: 'sqlite' }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS.split(','),
    emailAndPassword: { enabled: true },
    plugins: [electron(), bearer()]
  })
}

export type Auth = ReturnType<typeof createAuth>
export type Session = Auth['$Infer']['Session']
