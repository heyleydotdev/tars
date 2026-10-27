import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'

import type { Auth } from '@tars/auth/server'
import type { Database } from '@tars/db/client'
import { rpcHandler } from '@tars/api/server'
import { createAuth } from '@tars/auth/server'
import { createDb } from '@tars/db/client'

type Variables = { db: Database; auth: Auth }

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

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

app.use('/api/rpc/*', async (c, next) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: '/api/rpc',
    context: { db: c.get('db'), auth: c.get('auth'), headers: c.req.raw.headers }
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

  return c.text('Internal Server Error', 500)
})

export default app
