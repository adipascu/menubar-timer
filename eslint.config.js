import js from '@eslint/js'
import html from 'eslint-plugin-html'
import globals from 'globals'

export default [
  { ignores: ['dist/', '.claude/'] },
  js.configs.recommended,
  {
    rules: { 'no-unused-vars': ['error', { ignoreRestSiblings: true }] },
  },
  {
    files: ['**/*.js'],
    ignores: ['src/beacons.js'],
    languageOptions: { sourceType: 'module', globals: globals.node },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    files: ['src/beacons.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    files: ['src/**/*.html'],
    plugins: { html },
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
]
