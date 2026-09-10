import { defineConfig } from 'vitest/config';
import base from './vitest.config.mts';

// Unit tests must not migrate or require an integration database.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['tests/unit/**/*.test.ts'],
    globalSetup: [],
    fileParallelism: true,
  },
});
