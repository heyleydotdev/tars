import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

const envDir = resolve(import.meta.dirname, '../..')

const { dependencies = {} } = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8')
) as { dependencies?: Record<string, string> }

// Workspace packages ship TypeScript source, so they cannot be required at
// runtime: bundle them (their dependencies follow) instead of externalizing.
const workspacePackages = Object.keys(dependencies).filter((name) =>
  dependencies[name]?.startsWith('workspace:')
)

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
