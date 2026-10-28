import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'

import type { Auth } from '@tars/auth/server'
import type { Database } from '@tars/db/client'
import { rpcHandler, rpcWebSocketHandler } from '@tars/api/server'
import { createAuth } from '@tars/auth/server'
import { META_ASR_URL } from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { createDb } from '@tars/db/client'

type Variables = { db: Database; auth: Auth }

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Muse Voice Transcribe only accepts mono 16-bit PCM WAV; the renderer records
// webm and converts before sending.
async function transcribe(env: Env, audio: Uint8Array): Promise<string> {
  const form = new FormData()

  form.append(
    'request',
    new Blob(
      [
        JSON.stringify({
          model: 'muse-voice-transcribe-1.0',
          mode: 'PUSH_TO_TALK',
          audioEncoding: 'WAV',
          languageBias: ['English'],
          keywords: ['Tars']
        })
      ],
      { type: 'application/json' }
    )
  )
  form.append('audio', new Blob([audio], { type: 'audio/wav' }), 'audio.wav')

  const response = await fetch(META_ASR_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.META_AI_API}` },
    body: form,
    signal: AbortSignal.timeout(15_000)
  })

  if (!response.ok) {
    const detail = await response.text()
    console.error('Transcription failed', response.status, detail)
    throw new Error(`Meta transcription failed with status ${response.status}`)
  }

  const data = (await response.json()) as { transcript?: string }

  return data.transcript?.trim() ?? ''
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
    context: {
      db: c.get('db'),
      auth: c.get('auth'),
      headers: c.req.raw.headers,
      transcribe: (audio) => transcribe(c.env, audio)
    }
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
      transcribe: (audio) => transcribe(c.env, audio)
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
