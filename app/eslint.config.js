import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import unusedImports from 'eslint-plugin-unused-imports'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { 'unused-imports': unusedImports },
    rules: {
      // Auto-removable with --fix; keeps dead imports from accumulating again.
      'unused-imports/no-unused-imports': 'error',
      // _-prefix is the project convention for intentionally unused params;
      // rest siblings cover the `const { secret, ...safe } = row` omit pattern.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
        ignoreRestSiblings: true,
      }],
      // React-compiler advisory rules (react-hooks v6) — warn until the
      // legacy effect patterns they flag are refactored deliberately.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      // 481 pre-existing `any`s — warn (not error) with a CI --max-warnings
      // ratchet so the count can only decrease. Tighten to 'error' once paid down.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Fast-refresh DX hint, not a correctness rule; shared.tsx files
      // legitimately export helpers alongside components.
      'react-refresh/only-export-components': 'warn',
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
