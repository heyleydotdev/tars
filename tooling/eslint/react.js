import { plugin as shadcn } from '@shadcn/lint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig } from 'eslint/config'
import globals from 'globals'

import base from './base.js'

export default defineConfig([
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser
    },
    plugins: { shadcn },
    settings: {
      shadcn: {
        ui: '@tars/ui/components',
        themeImports: ['^@tars/ui/']
      }
    },
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'generic', readonly: 'generic' }],
      '@typescript-eslint/prefer-as-const': 'error'
    }
  }
])
