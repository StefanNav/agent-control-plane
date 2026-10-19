import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['dist', 'designs', 'reference', 'playwright-report', 'test-results', '.superpowers', '.visual'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // The layers (docs/design-system/README.md): design-system → components → features. Each may
  // import only from the layers below it, so a primitive can't learn about hospitals and a
  // component can't reach into the store.
  {
    files: ['src/design-system/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)(components|features|layout|store|data|prototype|app)(/|$)',
              message: 'The design system has no product knowledge: it may import only itself and src/lib.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)(features|layout|store|prototype|app)(/|$)',
              message: 'Product components are pure: props in, callbacks out. Read the store in the feature that renders them.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/layout/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: 'design-system/(?!index$)',
              message: "Import from the design system's front door ('…/design-system'), so its insides can change.",
            },
          ],
        },
      ],
    },
  },
  {
    // The prototype layer (gallery, About, tour) may also set type with the role classes.
    files: ['src/prototype/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: 'design-system/(?!index$|type\\.module\\.css$)',
              message: "Import from the design system's front door ('…/design-system'), so its insides can change.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  prettier,
)
