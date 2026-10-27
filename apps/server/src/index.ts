import { rpcHandler } from '@tars/api/server'
import { createAuth } from '@tars/auth/server'
import { createDb } from '@tars/db/client'

export default {
  async fetch(request, env) {
    const db = createDb(env.DB)
    const auth = createAuth({
      db,
      BETTER_AUTH_URL: env.BETTER_AUTH_URL,
      BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET
    })

    if (new URL(request.url).pathname.startsWith('/api/auth')) {
      return auth.handler(request)
    }

    const { matched, response } = await rpcHandler.handle(request, {
      prefix: '/api/rpc',
      context: { db, auth, headers: request.headers }
    })

    return matched ? response : new Response('Not Found', { status: 404 })
  }
} satisfies ExportedHandler<Env>
