import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

process.env.BETTER_AUTH_SECRET = 'test-secret-test-secret-test-secret-32'
process.env.BETTER_AUTH_URL = 'http://localhost:3001'
process.env.META_AI_API = ''

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-32',
          BETTER_AUTH_URL: 'http://localhost:3001',
          BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000,com.tars.desktop:/',
          META_AI_API: ''
        }
      }
    })
  ],
  resolve: {
    alias: {
      'bun:test': 'vitest'
    }
  },
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000
  }
})
