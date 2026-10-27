import type { RPCLinkOptions } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'

import type { Router } from './router'

export function createRpcClient(options: RPCLinkOptions<object>) {
  return createTanstackQueryUtils(createORPCClient<RouterClient<Router>>(new RPCLink(options)))
}
