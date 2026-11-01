import { createRpcClient } from '@tars/api/client'

const baseURL = import.meta.env.VITE_BETTER_AUTH_URL

if (!baseURL) throw new Error('VITE_BETTER_AUTH_URL is required')

export const apiBaseUrl = baseURL

export async function authHeaders(): Promise<Record<string, string>> {
  const session = await window.getSession()

  return session ? { authorization: `Bearer ${session.session.token}` } : {}
}

export const orpc = createRpcClient({
  origin: baseURL,
  url: '/api/rpc',
  headers: authHeaders
})
