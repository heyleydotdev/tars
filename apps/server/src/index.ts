import { rpcHandler } from '@tars/api/server'

export default {
  async fetch(request) {
    const { matched, response } = await rpcHandler.handle(request, {
      prefix: '/api/rpc'
    })

    if (matched) {
      return response
    }

    return new Response('Not Found', { status: 404 })
  }
} satisfies ExportedHandler<Env>
