import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import type { Auth } from '@tars/auth/server'
import type { FileBucket } from '@tars/core/services/files'
import type { Database as ApiDatabase } from '@tars/db/client'
import { user } from '@tars/db/schema'
import * as schema from '@tars/db/schema'

import { rpcHandler } from '../../src/server'

const MIGRATIONS_DIR = resolve(import.meta.dirname, '../../../db/migrations')

export const TEST_USER_ID = 'user-test'

export async function createTestDb(): Promise<ApiDatabase> {
  const sqlite = new Database(':memory:')

  sqlite.pragma('foreign_keys = ON')

  for (const file of readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    sqlite.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  }

  const db = drizzle(sqlite, { schema }) as unknown as ApiDatabase
  const batchable = db as unknown as {
    batch?: (queries: ReadonlyArray<Promise<unknown>>) => Promise<Array<unknown>>
  }

  // better-sqlite3 has no D1 batch; the routes only need sequential execution here.
  if (typeof batchable.batch !== 'function') {
    batchable.batch = async (queries) => {
      const results: Array<unknown> = []

      for (const query of queries) results.push(await query)

      return results
    }
  }

  await db.insert(user).values({
    id: TEST_USER_ID,
    name: 'Test User',
    email: 'test@tars.dev',
    emailVerified: true
  })

  return db
}

export type TestFiles = FileBucket & {
  put: (key: string, bytes: Uint8Array, contentType: string) => void
  has: (key: string) => boolean
}

export function createTestFiles(): TestFiles {
  const objects = new Map<string, { bytes: ArrayBuffer; contentType: string }>()

  return {
    put: (key, bytes, contentType) => {
      const buffer = new ArrayBuffer(bytes.byteLength)

      new Uint8Array(buffer).set(bytes)
      objects.set(key, { bytes: buffer, contentType })
    },
    has: (key) => objects.has(key),
    get: async (key) => {
      const object = objects.get(key)

      if (!object) return null

      return {
        body: new Blob([object.bytes]).stream(),
        httpMetadata: { contentType: object.contentType }
      }
    },
    delete: async (keys) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) objects.delete(key)
    }
  }
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

export async function callRpcRaw(
  db: ApiDatabase,
  path: string,
  input?: unknown,
  files: FileBucket = createTestFiles()
): Promise<{ status: number; text: string }> {
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
        fileSecret: 'file-secret-file-secret-file-secret-32',
        files
      }
    }
  )

  if (!matched) throw new Error(`No rpc procedure matched ${path}`)

  return { status: response.status, text: await response.text() }
}

export async function callRpc(
  db: ApiDatabase,
  path: string,
  input?: unknown,
  files?: FileBucket
): Promise<{ status: number; body: unknown }> {
  const { status, text } = await callRpcRaw(db, path, input, files)

  return { status, body: text ? JSON.parse(text) : null }
}
