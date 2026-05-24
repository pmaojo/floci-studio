import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['sidecar/__tests__/**/*.test.ts'],
    globals: false,
    testTimeout: 10000,
  },
});
