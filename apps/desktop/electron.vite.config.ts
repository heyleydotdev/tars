import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

const envDir = resolve(import.meta.dirname, '../..')

// Workspace packages ship TypeScript source, so they cannot be required at
// runtime: bundle them (their dependencies follow). Keep this explicit.
const workspacePackages = ['@tars/auth', '@tars/core']

export default defineConfig({
  main: {
    envDir,
    build: { externalizeDeps: { exclude: workspacePackages } }
  },
  preload: {
    build: { externalizeDeps: { exclude: workspacePackages } }
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
