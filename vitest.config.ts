import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
    // Plan 4: every core busy made vitest's worker calls time out ("Timeout calling
    // onTaskUpdate") and fail the run although every test passed; half the cores is faster too.
    maxWorkers: '50%',
    // Plan 5: with the browser and bot suites in one process the run still ended with one
    // "Timeout calling onTaskUpdate" although every test passed, even on an idle machine, and each
    // half passes alone. So `pnpm test` runs the web project first, then all other projects, and
    // exits 0 only if both pass. Revisit when vitest is upgraded (docs/BACKLOG.md).
  },
})
