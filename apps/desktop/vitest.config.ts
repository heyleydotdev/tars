import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    env: {
      VITE_BETTER_AUTH_URL: 'http://localhost:3001'
    }
  }
})
