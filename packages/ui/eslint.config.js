import { defineConfig } from 'eslint/config'

import react from '@tars/eslint/react'

export default defineConfig([
  ...react,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      // shadcn exports cva variants beside the component.
      'react-refresh/only-export-components': 'off'
    }
  }
])
