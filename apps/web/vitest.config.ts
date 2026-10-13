import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'web',
    // Full bot runs and browser tests take seconds; CI runners are slower than a laptop.
    testTimeout: 30_000,
    environment: 'node',
    // The store reads scenarios from the cache the app fills in the background (step 8).
    setupFiles: ['./test/setup.ts'],
  },
})
