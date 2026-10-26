import path from 'node:path'
import js from '@eslint/js'
import turboConfig from 'eslint-config-turbo/flat'
import { defineConfig, includeIgnoreFile } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
  includeIgnoreFile(path.join(import.meta.dirname, '../../.gitignore'), {
    gitignoreResolution: true
  }),
  ...turboConfig,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' }
      ],
      '@typescript-eslint/no-non-null-assertion': 'error'
    }
  },
  {
    // Type-aware rules: require parserOptions.project (set per package).
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } }
      ],
      '@typescript-eslint/no-unnecessary-condition': [
        'error',
        { allowConstantLoopConditions: true }
      ]
    }
  }
])
