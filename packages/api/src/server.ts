import { RPCHandler as FetchRPCHandler } from '@orpc/server/fetch'
import {
  RequestHeadersHandlerPlugin,
  RequestLimitHandlerPlugin,
  ResponseHeadersHandlerPlugin,
  SignalSyncHandlerPlugin
} from '@orpc/server/plugins'
import { RPCHandler as WebSocketRPCHandler } from '@orpc/server/websocket'

import { router } from './router'

export type { Router } from './router'

const plugins = [
  new RequestHeadersHandlerPlugin(),
  new ResponseHeadersHandlerPlugin(),
  new SignalSyncHandlerPlugin(),
  new RequestLimitHandlerPlugin({ maxBodySize: 26 * 1024 * 1024 })
]

export const rpcHandler = new FetchRPCHandler(router, { plugins })

export const rpcWebSocketHandler = new WebSocketRPCHandler(router, { plugins })
