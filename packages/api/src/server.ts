import { createRouterClient } from '@orpc/server'
import { RPCHandler as FetchRPCHandler } from '@orpc/server/fetch'
import { RPCHandler as WebSocketRPCHandler } from '@orpc/server/websocket'

import type { RpcServerContext } from './context'
import { router } from './router'

export { router, type Router } from './router'

export const rpcHandler = new FetchRPCHandler(router)

export const rpcWebSocketHandler = new WebSocketRPCHandler(router)

export function createRpcServer(context: RpcServerContext) {
  return createRouterClient(router, { context })
}
