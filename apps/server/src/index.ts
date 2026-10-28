import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'

import type { Auth } from '@tars/auth/server'
import type { Database } from '@tars/db/client'
import { rpcHandler, rpcWebSocketHandler } from '@tars/api/server'
import { createAuth } from '@tars/auth/server'
import { ERRORS } from '@tars/core/errors'
import { createDb } from '@tars/db/client'

type Variables = { db: Database; auth: Auth }

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

function toHeaders(source: Record<string, string | Array<string> | undefined>): Headers {
  const headers = new Headers()

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue

    for (const item of Array.isArray(value) ? value : [value]) {
      headers.append(key, item)
    }
  }

  return headers
}

app.use(
  '/api/*',
  cors({
    origin: (origin, c) =>
      c.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').includes(origin) ? origin : null,
    credentials: true,
    allowHeaders: ['content-type'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 600
  })
)

app.use('/api/*', async (c, next) => {
  const db = createDb(c.env.DB)

  c.set('db', db)
  c.set(
    'auth',
    createAuth({
      db,
      BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
      BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_TRUSTED_ORIGINS: c.env.BETTER_AUTH_TRUSTED_ORIGINS
    })
  )

  await next()
})

app.all('/api/auth/*', (c) => c.get('auth').handler(c.req.raw))

app.get('/api/ws', (c) => {
  if (c.req.header('upgrade') !== 'websocket') {
    return c.text(ERRORS.websocketUpgradeRequired, 426)
  }

  const origin = c.req.header('origin')

  // Browsers send Origin on upgrades; native clients (Electron main) do not.
  if (origin && !c.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').includes(origin)) {
    return c.text(ERRORS.forbidden, 403)
  }

  const pair = new WebSocketPair()
  const client = pair[0]
  const server = pair[1]

  server.accept()
  rpcWebSocketHandler.upgrade(server, {
    context: (request) => ({
      db: c.get('db'),
      auth: c.get('auth'),
      headers: toHeaders(request.headers),
      metaAiApiKey: c.env.META_AI_API
    })
  })

  return new Response(null, { status: 101, webSocket: client })
})

app.use('/api/rpc/*', async (c, next) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: '/api/rpc',
    context: {
      db: c.get('db'),
      auth: c.get('auth'),
      headers: c.req.raw.headers,
      metaAiApiKey: c.env.META_AI_API
    }
  })

  if (matched) {
    return c.newResponse(response.body, response)
  }

  await next()
})

app.notFound((c) => c.text('Not Found', 404))

app.onError((error, c) => {
  console.error(error)

  if (error instanceof HTTPException) {
    return error.getResponse()
  }

  return c.text(ERRORS.internalServer, 500)
})

export default app
