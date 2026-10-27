import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

const envDir = resolve(import.meta.dirname, '../..')

export default defineConfig({
  main: {
    envDir,
    // Workspace source packages must be bundled; their dependencies follow.
    build: { externalizeDeps: { exclude: ['@tars/auth'] } }
  },
  preload: {
    build: { externalizeDeps: { exclude: ['@tars/auth'] } }
  },
  renderer: {
    envDir,
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [tailwindcss(), react()],
    server: { host: '0.0.0.0', port: 3000 }
  }
})
