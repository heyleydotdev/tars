import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

// electron-vite externalizes `dependencies` for main/preload by default
// (`build.externalizeDeps`), so no plugin is needed there.
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()],
    server: { host: '0.0.0.0' }
  }
})
