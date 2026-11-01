import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'

import type { Auth } from '@tars/auth/server'
import type { Database as ApiDatabase } from '@tars/db/client'
import { user } from '@tars/db/schema'
import * as schema from '@tars/db/schema'

import { rpcHandler } from '../../src/server'

const MIGRATIONS_DIR = resolve(import.meta.dirname, '../../../db/migrations')

export const TEST_USER_ID = 'user-test'

export async function createTestDb(): Promise<ApiDatabase> {
  const sqlite = new Database(':memory:')

  sqlite.exec('PRAGMA foreign_keys = ON;')

  for (const file of readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    sqlite.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  }

  const db = drizzle(sqlite, { schema }) as unknown as ApiDatabase

  await db.insert(user).values({
    id: TEST_USER_ID,
    name: 'Test User',
    email: 'test@tars.dev',
    emailVerified: true
  })

  return db
}

const session = {
  user: {
    id: TEST_USER_ID,
    name: 'Test User',
    email: 'test@tars.dev',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  session: {
    id: 'session-test',
    token: 'token-test',
    userId: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 86_400_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: null,
    userAgent: null
  }
}

export async function callRpc(
  db: ApiDatabase,
  path: string,
  input?: unknown
): Promise<{ status: number; body: unknown }> {
  const { matched, response } = await rpcHandler.handle(
    new Request(`http://test/api/rpc/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: input === undefined ? '{}' : JSON.stringify({ json: input })
    }),
    {
      prefix: '/api/rpc',
      context: {
        db,
        auth: { api: { getSession: async () => session } } as unknown as Auth,
        metaAiApiKey: '',
        measureImages: {} as never
      }
    }
  )

  if (!matched) throw new Error(`No rpc procedure matched ${path}`)

  const text = await response.text()

  return { status: response.status, body: text ? JSON.parse(text) : null }
}
