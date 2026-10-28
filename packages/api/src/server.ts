import { createRouterClient } from '@orpc/server'
import { RPCHandler as FetchRPCHandler } from '@orpc/server/fetch'
import { RequestHeadersHandlerPlugin } from '@orpc/server/plugins'
import { RPCHandler as WebSocketRPCHandler } from '@orpc/server/websocket'

import type { RpcServerContext } from './context'
import { router } from './router'

export { router, type Router } from './router'

const plugins = [new RequestHeadersHandlerPlugin()]

export const rpcHandler = new FetchRPCHandler(router, { plugins })

export const rpcWebSocketHandler = new WebSocketRPCHandler(router, { plugins })

export function createRpcServer(context: RpcServerContext) {
  return createRouterClient(router, { context })
}
