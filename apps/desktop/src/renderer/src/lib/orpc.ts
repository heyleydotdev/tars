import { createRpcClient } from '@tars/api/client'

const baseURL: string = import.meta.env.VITE_BETTER_AUTH_URL

export const orpc = createRpcClient({
  origin: baseURL,
  url: '/api/rpc',
  headers: async () => {
    const session = await window.getSession()

    return session ? { authorization: `Bearer ${session.session.token}` } : {}
  }
})
