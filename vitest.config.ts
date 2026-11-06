import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
    // Plan 4: every core busy made vitest's worker calls time out ("Timeout calling
    // onTaskUpdate") and fail the run although every test passed; half the cores is faster too.
    maxWorkers: '50%',
    // Plan 5, 8: with several projects in one process the run still ended with one
    // "Timeout calling onTaskUpdate" although every test passed, even on an idle machine, and
    // each project passes alone. Splitting into web and the rest was not enough either. So
    // `pnpm test` runs one `vitest run` per project (web, engine, content, bots), one after the
    // other, and exits non-zero if any fails. Add a new project to the script too. The last cause was a bots test file of
    // back to back synchronous runs lasting over 60 s; it now yields between runs. Revisit when
    // vitest is upgraded (docs/BACKLOG.md).
  },
})
