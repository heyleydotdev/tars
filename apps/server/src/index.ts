import { rpcHandler } from '@tars/api/server'
import { createAuth } from '@tars/auth/server'
import { createDb } from '@tars/db/client'

function corsHeaders(origin: string): Headers {
  return new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin'
  })
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin')
    const allowedOrigin =
      origin && env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').includes(origin) ? origin : null

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: allowedOrigin ? corsHeaders(allowedOrigin) : undefined
      })
    }

    const db = createDb(env.DB)
    const auth = createAuth({
      db,
      BETTER_AUTH_URL: env.BETTER_AUTH_URL,
      BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
      BETTER_AUTH_TRUSTED_ORIGINS: env.BETTER_AUTH_TRUSTED_ORIGINS
    })

    const response = new URL(request.url).pathname.startsWith('/api/auth')
      ? await auth.handler(request)
      : await handleRpc(request, db, auth)

    if (!allowedOrigin) {
      return response
    }

    const headers = new Headers(response.headers)
    for (const [name, value] of corsHeaders(allowedOrigin)) {
      headers.set(name, value)
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  }
} satisfies ExportedHandler<Env>

async function handleRpc(
  request: Request,
  db: ReturnType<typeof createDb>,
  auth: ReturnType<typeof createAuth>
) {
  const { matched, response } = await rpcHandler.handle(request, {
    prefix: '/api/rpc',
    context: { db, auth, headers: request.headers }
  })

  return matched ? response : new Response('Not Found', { status: 404 })
}
