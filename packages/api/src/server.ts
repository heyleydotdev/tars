import { createRouterClient } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'

import { router } from './router'

export { router, type Router } from './router'

export const rpcHandler = new RPCHandler(router)

export function createRpcServer() {
  return createRouterClient(router)
}
