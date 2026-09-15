import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    globalSetup: ['tests/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Les tests d'intégration partagent une base : exécution séquentielle.
    fileParallelism: false,
  },
  resolve: {
    alias: [
      { find: /^@devisia\/shared\/(.*)$/, replacement: fileURLToPath(new URL('./packages/shared/src/', import.meta.url)) + '$1' },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: '@devisia/shared', replacement: fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url)) },
      // `server-only` refuse de se charger hors contexte serveur React.
      { find: 'server-only', replacement: fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)) },
    ],
  },
});
