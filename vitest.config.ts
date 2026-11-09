import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
    // Plan 4: every core busy made vitest's worker calls time out ("Timeout calling
    // onTaskUpdate") and fail the run although every test passed; half the cores is faster too.
    maxWorkers: '50%',
    // Plan 5, 8: with several projects in one process the run still ended with one
    // "Timeout calling onTaskUpdate" although every test passed. Splitting into web and the rest
    // was not enough, so `pnpm test` runs one `vitest run` per project (web, engine, content,
    // bots), one after the other, and exits non-zero if any fails. Add a new project to the
    // script too. The cause on CI was a file of back to back synchronous bot tests (over 60 s
    // there) starving the worker's event loop; the bots project now yields after every test
    // (packages/bots/test/yield.setup.ts). Revisit when vitest is upgraded (docs/BACKLOG.md).
  },
})
