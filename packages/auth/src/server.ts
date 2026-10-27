import type { D1Database } from '@cloudflare/workers-types'
import { betterAuth } from 'better-auth'

export type AuthEnv = {
  DB: D1Database
  BETTER_AUTH_SECRET?: string
}

export function createAuth(env: AuthEnv) {
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true }
  })
}

export type Auth = ReturnType<typeof createAuth>

export type Session = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>

export { getMigrations } from 'better-auth/db/migration'
