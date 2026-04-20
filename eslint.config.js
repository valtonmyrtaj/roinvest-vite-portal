import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Module boundary: direct imports of the raw Supabase client are limited to
// the data-access layer plus the auth bootstrap context.
//
// The ratchet is intentionally aggressive: any NEW file importing
// `src/lib/supabase` directly fails lint.
const supabaseImportRestriction = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          regex:
            '^(?:\\.{1,2}/)+(?:lib/)?supabase(?:\\.[^/]+)?$|^(?:@/|src/)lib/supabase(?:\\.[^/]+)?$',
          message:
            'Do not import the Supabase client directly. Use src/lib/api/** instead.',
        },
      ],
    },
  ],
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      ...supabaseImportRestriction,
    },
  },
  // Allowed importers of the raw Supabase client:
  //  • src/lib/api/**        — the data-access layer itself
  //  • src/context/AuthContext.tsx — auth session bootstrap and approved-user
  //    gate, intentionally coupled to the auth client for now
  {
    files: [
      'src/lib/api/**/*.{ts,tsx}',
      'src/context/AuthContext.tsx',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
])
