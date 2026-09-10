// Configuration ESLint de l'application mobile (règles React Native / Expo).
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // eslint-plugin-import resolves the workspace alias by walking all of
      // C:\\Users on Windows, which is denied in the sandbox and makes lint
      // fail before it can inspect a source file. TypeScript remains the
      // authoritative resolver for these aliases.
      'import/no-unresolved': 'off',
    },
  },
]);
