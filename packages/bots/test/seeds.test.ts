import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadScenario, SCENARIO_IDS, type ScenarioId } from '@founder-mode/content'
import { ENDING_ROUTES, parseSeedsTable, playSeed } from '../src/endingSeeds'

const doc = readFileSync(fileURLToPath(new URL('../../../docs/seeds.md', import.meta.url)), 'utf8')
const rows = parseSeedsTable(doc)

describe('docs/seeds.md', () => {
  it('lists two or three seeds for every ending of every scenario', () => {
    for (const id of SCENARIO_IDS) {
      for (const { ending } of ENDING_ROUTES) {
        const n = rows.filter((r) => r.scenario === id && r.ending === ending).length
        expect(n, `${id} ${ending}`).toBeGreaterThanOrEqual(2)
        expect(n, `${id} ${ending}`).toBeLessThanOrEqual(3)
      }
    }
  })

  // When this fails, the engine, the content or a bot changed: run `pnpm seeds` and commit.
  it.each(rows.map((r) => [r.scenario, r.ending, r.strategy, r.seed, r] as const))(
    '%s %s: %s on %s still ends there',
    (_s, _e, _st, _seed, row) => {
      const r = playSeed(loadScenario(row.scenario as ScenarioId), row.strategy, row.seed)
      expect(r).toEqual({ ending: row.ending, week: row.week })
    },
  )
})
