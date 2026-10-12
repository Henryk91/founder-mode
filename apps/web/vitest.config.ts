import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'web',
    // Full bot runs and browser tests take seconds; CI runners are slower than a laptop.
    testTimeout: 30_000,
    environment: 'node',
  },
})
