import { defineConfig, globalIgnores } from 'eslint/config'

import base from '@tars/eslint/base'

export default defineConfig([
  ...base,
  globalIgnores(['.wrangler/', 'worker-configuration.d.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
])
