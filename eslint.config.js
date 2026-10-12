import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const nodeBuiltins = [
  'assert',
  'buffer',
  'child_process',
  'crypto',
  'events',
  'fs',
  'fs/promises',
  'os',
  'path',
  'process',
  'stream',
  'url',
  'util',
  'worker_threads',
]

export default tseslint.config(
  // Local diagnostics (`*.tmp.ts`) are never committed.
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', 'docs/**', '**/*.tmp.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Engine: pure, deterministic TypeScript. No React, DOM, Node, or app code.
  {
    files: ['packages/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: nodeBuiltins.map((name) => ({
            name,
            message: 'The engine must not use Node APIs.',
          })),
          patterns: [
            { group: ['node:*'], message: 'The engine must not use Node APIs.' },
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'zustand', 'zustand/*'],
              message: 'The engine must not depend on UI libraries.',
            },
            {
              group: ['@founder-mode/web', '@founder-mode/web/*', '**/apps/**'],
              message: 'The engine must not import from apps.',
            },
            {
              group: ['@founder-mode/bots', '@founder-mode/bots/*'],
              message: 'The engine must not import from bots.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'Not deterministic. Use the week counter in GameState.' },
        { name: 'window', message: 'The engine must not use the DOM.' },
        { name: 'document', message: 'The engine must not use the DOM.' },
        { name: 'localStorage', message: 'The engine must not use browser storage.' },
        { name: 'process', message: 'The engine must not use Node APIs.' },
        { name: 'Intl', message: 'Locale dependent. Keep formatting in the UI.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the PRNG in GameState.' },
        { property: 'toLocaleString', message: 'Locale dependent. Keep formatting in the UI.' },
        { property: 'toLocaleDateString', message: 'Locale dependent.' },
        { property: 'toLocaleTimeString', message: 'Locale dependent.' },
        { property: 'localeCompare', message: 'Locale dependent. Compare with < and >.' },
      ],
    },
  },

  // Engine source may use content types, but never its runtime (zod, YAML). Tests may load it.
  {
    files: ['packages/engine/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@founder-mode/content',
              allowTypeImports: true,
              message: 'Use `import type`. The engine receives the scenario as data.',
            },
          ],
        },
      ],
    },
  },

  // Node side: bots CLI and config files.
  {
    files: [
      'packages/bots/**/*.ts',
      '*.config.{js,ts}',
      'apps/web/vite.config.ts',
      'apps/web/build/**/*.ts',
      'apps/web/scripts/**/*.mjs',
    ],
    languageOptions: { globals: globals.node },
  },

  // Web app: browser globals and hooks rules.
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
)
