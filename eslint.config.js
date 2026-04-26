import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/** Layer-dependency table — negated list per layer (forbidden imports). */
const forbiddenByLayer = {
  domain: [
    '@/state/**', '@/state', '@/interaction/**', '@/interaction',
    '@/notation/**', '@/notation', '@/canvas/**', '@/canvas',
    '@/ui/**', '@/ui', '@/platform/**', '@/platform', '@/app/**', '@/app',
  ],
  platform: [
    '@/state/**', '@/state', '@/interaction/**', '@/interaction',
    '@/notation/**', '@/notation', '@/canvas/**', '@/canvas',
    '@/ui/**', '@/ui', '@/app/**', '@/app',
  ],
  state: [
    '@/interaction/**', '@/interaction', '@/notation/**', '@/notation',
    '@/canvas/**', '@/canvas', '@/ui/**', '@/ui',
    '@/platform/**', '@/platform', '@/app/**', '@/app',
  ],
  interaction: [
    '@/notation/**', '@/notation', '@/canvas/**', '@/canvas',
    '@/ui/**', '@/ui', '@/platform/**', '@/platform', '@/app/**', '@/app',
  ],
  notation: [
    '@/state/**', '@/state', '@/interaction/**', '@/interaction',
    '@/canvas/**', '@/canvas', '@/ui/**', '@/ui',
    '@/platform/**', '@/platform', '@/app/**', '@/app',
  ],
  canvas: [
    '@/ui/**', '@/ui', '@/platform/**', '@/platform', '@/app/**', '@/app',
  ],
  ui: [
    '@/app/**', '@/app',
  ],
}

const layerRule = (forbidden) => ({
  'no-restricted-imports': ['error', {
    patterns: [
      ...forbidden.map((p) => ({ group: [p], message: 'Layer-boundary violation — see spec §2.2.' })),
      { group: ['**/legacy/**', '*/legacy/*'], message: 'legacy/ is reference-only.' },
    ],
  }],
})

export default defineConfig([
  globalIgnores(['dist', 'src/legacy/**', 'playwright-report', 'test-results', 'coverage']),

  // Base config for all TS/TSX files in src/ and tests/.
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      'max-lines': ['warn', { max: 350, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 15],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Use named exports (see spec §8.3).' },
      ],
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/legacy/**', '*/legacy/*'], message: 'legacy/ is reference-only.' },
        ],
      }],
    },
  },

  // Layer-boundary overrides. Each layer's forbidden imports are declared in forbiddenByLayer above.
  // src/app/ is intentionally absent here — it is the composition root and may import any layer (spec §2.2).
  // Layer rules only catch imports via the '@/' path alias; relative-parent imports like '../state/foo'
  // slip through. Keep cross-layer imports alias-form for enforcement to apply.
  { files: ['src/domain/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.domain) },
  { files: ['src/platform/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.platform) },
  { files: ['src/state/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.state) },
  { files: ['src/interaction/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.interaction) },
  { files: ['src/notation/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.notation) },
  { files: ['src/canvas/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.canvas) },
  { files: ['src/ui/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.ui) },

  // src/App.tsx and src/main.tsx are the composition root — relax the layer rule.
  {
    files: ['src/App.tsx', 'src/main.tsx'],
    rules: { 'no-restricted-imports': ['error', {
      patterns: [{ group: ['**/legacy/**', '*/legacy/*'], message: 'legacy/ is reference-only.' }],
    }] },
  },

  // Test files may import across layers (they are composition roots too — they
  // wire the apply helpers + stores together to exercise full integration paths).
  // Only the legacy/ fence is kept.
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', {
      patterns: [{ group: ['**/legacy/**', '*/legacy/*'], message: 'legacy/ is reference-only.' }],
    }] },
  },

  // Config files can use default exports.
  {
    files: ['*.config.{js,ts}', 'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'tailwind.config.js', 'eslint.config.js'],
    rules: { 'no-restricted-syntax': 'off' },
  },
])
