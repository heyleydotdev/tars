import { defineConfig, globalIgnores } from 'eslint/config'

import base from '@tars/eslint/base'

export default defineConfig([
  ...base,
  // Runs under drizzle-kit, not the app, so it is outside the tsconfig.
  globalIgnores(['drizzle.config.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
])
