import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
    // Plan 4: every core busy made vitest's worker calls time out ("Timeout calling
    // onTaskUpdate") and fail the run although every test passed; half the cores is faster too.
    maxWorkers: '50%',
  },
})
