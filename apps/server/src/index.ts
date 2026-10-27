import { rpcHandler } from '@tars/api/server'
import { createAuth } from '@tars/auth/server'

import handleMigrate from './migrate'

export default {
  async fetch(request, env) {
    const auth = createAuth(env)
    const pathname = new URL(request.url).pathname

    if (pathname === '/api/migrate') {
      return handleMigrate(request, env.BETTER_AUTH_MIGRATE_TOKEN, auth)
    }

    if (pathname.startsWith('/api/auth')) {
      return auth.handler(request)
    }

    const getSession = once(() => auth.api.getSession({ headers: request.headers }))

    const { matched, response } = await rpcHandler.handle(request, {
      prefix: '/api/rpc',
      context: { getSession }
    })

    return matched ? response : new Response('Not Found', { status: 404 })
  }
} satisfies ExportedHandler<Env>

function once<T>(fn: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined

  return () => {
    promise ??= fn()
    return promise
  }
}
