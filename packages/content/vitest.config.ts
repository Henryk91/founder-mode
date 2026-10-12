import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'content',
    // Full bot runs and browser tests take seconds; CI runners are slower than a laptop.
    testTimeout: 30_000,
  },
})
