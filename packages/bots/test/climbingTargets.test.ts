import { describe, expect, it } from 'vitest'
import { loadScenario } from '@founder-mode/content'
import { runGame, type RunResult } from '../src/simulate'
import { CAREFUL_TOURISM, tourismPlayer } from '../src/strategies/tourism'
import { climbingTargets } from '../src/leisureTargets'
import { evaluateTourismTargets } from '../src/tourismReport'
import type { StrategyRuns } from '../src/report'
const base = runGame(
  loadScenario('schweissperle', 'long'),
  { id: 'fixture', description: 'fixture', create: (s) => tourismPlayer(s, CAREFUL_TOURISM) },
  'unused',
)
function runs(id: string, wins: number[], ropeOpened: number[] = []): StrategyRuns {
  return {
    id,
    description: id,
    seconds: 0,
    results: wins.map((win, i): RunResult => ({
      ...base,
      strategy: id,
      ending: win ? 'sustainable' : 'still_searching',
      tourism: {
        ...base.tourism!,
        leisure: {
          openingWeek: 10,
          roomsBuilt: 1,
          refreshes: 1,
          climbing: {
            ropeOpened: ropeOpened.includes(i),
            firstWalls: ['rope_walls'],
            speedWallWeek: null,
            courseGraduates: 0,
          },
        },
      },
    })),
  }
}
function fixture() {
  const data = [
    runs('tourism_careful', [1, 1, 1, 1, 0, 0]),
    runs('climbing_boulder_first', [1, 1, 0, 1, 0, 0]),
    runs('climbing_rope_first', [0, 1, 1, 1, 0, 0], [2]),
    runs('climbing_both_first', [0, 0, 0, 1, 0, 1]),
    runs('climbing_rope_no_courses', [0, 0, 0, 0, 0, 0]),
    runs('climbing_setting_half', [0, 0, 0, 0, 0, 0]),
    runs('climbing_setting_double', [0, 0, 0, 0, 0, 0]),
    runs('climbing_aggregator_all', [0, 0, 0, 0, 0, 0]),
    runs('climbing_aggregator_none', [0, 0, 0, 0, 0, 0]),
    runs('climbing_speed_early', [0, 0, 0, 0, 0, 0]),
  ]
  return data
}
describe('climbing paired targets', () => {
  it('reports all-outcome ties separately from sole and joint first-build wins', () => {
    const data = fixture(),
      rows = climbingTargets(data[0]!, (id) => data.find((x) => x.id === id), [0, 1, 2, 3, 4, 5])
    const first = rows.find((r) => r.id === 'K1')!
    expect(first.value).toContain('boulder_first 50.0% (1 sole,1 joint)')
    expect(first.value).toContain('both_first 25.0% (1 sole,0 joint)')
    expect(first.value).toContain('differing 4,all-outcome ties 2')
    expect(first.pass).toBe(true)
    expect(rows.find((r) => r.id === 'K4')!.value).toContain('rope-opened 1,no-rope baseline 5')
    expect(rows.find((r) => r.id === 'K4')!.pass).toBe(true)
  })
  it('does not claim a course comparison on seeds without an opened rope wall', () => {
    const data = fixture().map((x) =>
      x.id === 'climbing_rope_first' ? runs(x.id, [0, 1, 1, 1, 0, 0]) : x,
    )
    const rows = climbingTargets(
      data[0]!,
      (id) => data.find((x) => x.id === id),
      [0, 1, 2, 3, 4, 5],
    )
    expect(rows.find((r) => r.id === 'K4')!.pass).toBe(false)
    expect(rows.find((r) => r.id === 'K4')!.value).toContain('rope-opened 0')
  })
  it('includes K1–K5 and visitor booking policy separately from membership notice', () => {
    const rows = evaluateTourismTargets({
      engineVersion: 'test',
      runs: 6,
      seedPrefix: 'fixture',
      tourism: true,
      strategies: fixture(),
    })
    for (const id of ['K1', 'K2', 'K3', 'K4', 'K5'])
      expect(rows.some((r) => r.id === id)).toBe(true)
    expect(rows.some((r) => r.id === 11)).toBe(true)
  })
})
