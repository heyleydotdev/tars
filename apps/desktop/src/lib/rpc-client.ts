import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/websocket'

import type { Router } from '@tars/api/server'

const endpoint = new URL(import.meta.env.VITE_BETTER_AUTH_URL)

endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:'
endpoint.pathname = '/api/ws'

const link = new RPCLink({
  connect: () => new WebSocket(endpoint),
  connectOnInit: true,
  reconnect: {
    enabled: true,
    onClose: { enabled: true }
  }
})

export const rpc = createORPCClient<RouterClient<Router>>(link)
