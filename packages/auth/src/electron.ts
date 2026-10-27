import type { BetterAuthClientPlugin } from 'better-auth/client'
import { electronClient } from '@better-auth/electron/client'
import { storage } from '@better-auth/electron/storage'
import { createAuthClient } from 'better-auth/client'

type ElectronPlugin = ReturnType<typeof electronClient>

// @better-auth/electron's declarations embed an older BetterFetch option shape.
// Replace only the incompatible property so the plugin's actions and $Infer
// (setupMain, Bridges) still flow into createAuthClient.
type ElectronPluginFix = Omit<ElectronPlugin, 'fetchPlugins'> & {
  fetchPlugins: NonNullable<BetterAuthClientPlugin['fetchPlugins']>
}

export function createElectronAuthClient(options: {
  baseURL: string
  signInURL: string
  scheme: string
}) {
  const plugin = electronClient({
    signInURL: options.signInURL,
    protocol: { scheme: options.scheme },
    storage: storage()
  })

  const compatiblePlugin: ElectronPluginFix = {
    ...plugin,
    fetchPlugins: plugin.fetchPlugins as unknown as ElectronPluginFix['fetchPlugins']
  }

  return createAuthClient({
    baseURL: options.baseURL,
    plugins: [compatiblePlugin]
  })
}
