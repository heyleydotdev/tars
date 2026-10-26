import { defineConfig } from 'eslint/config'

import react from '@tars/eslint/react'

export default defineConfig([
  ...react,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.preload.json', './tsconfig.web.json'],
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
])
