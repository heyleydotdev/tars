import { RPCHandler as FetchRPCHandler } from '@orpc/server/fetch'
import { RequestHeadersHandlerPlugin, SignalSyncHandlerPlugin } from '@orpc/server/plugins'
import { RPCHandler as WebSocketRPCHandler } from '@orpc/server/websocket'

import { router } from './router'

export type { Router } from './router'

const plugins = [new RequestHeadersHandlerPlugin(), new SignalSyncHandlerPlugin()]

export const rpcHandler = new FetchRPCHandler(router, { plugins })

export const rpcWebSocketHandler = new WebSocketRPCHandler(router, { plugins })
