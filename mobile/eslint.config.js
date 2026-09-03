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
    },
  },
]);
