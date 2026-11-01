import { createElectronAuthClient } from '@tars/auth/electron'
import { PROTOCOL_SCHEME } from '@tars/core/constants'

const baseURL = import.meta.env.VITE_BETTER_AUTH_URL

if (!baseURL) throw new Error('VITE_BETTER_AUTH_URL is required')

export const authClient = createElectronAuthClient({
  baseURL,
  signInURL: baseURL,
  scheme: PROTOCOL_SCHEME
})
