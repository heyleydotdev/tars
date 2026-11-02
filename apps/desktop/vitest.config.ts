import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { webdriverio } from '@vitest/browser-webdriverio'
import { defaultExclude, defineConfig } from 'vitest/config'

const vrtPattern = 'test/visual/**/*.vrt.test.tsx'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/**/*.test.ts'],
          exclude: [vrtPattern, ...defaultExclude],
          env: {
            VITE_BETTER_AUTH_URL: 'http://localhost:3001'
          }
        }
      },
      {
        test: {
          name: 'vrt',
          include: [vrtPattern],
          maxWorkers: 1,
          setupFiles: ['./test/visual/setup.ts'],
          env: {
            VITE_BETTER_AUTH_URL: 'http://localhost:3001'
          },
          browser: {
            enabled: true,
            headless: true,
            provider: webdriverio(),
            instances: [{ browser: 'edge', viewport: { width: 1280, height: 800 } }]
          }
        }
      }
    ]
  }
})
