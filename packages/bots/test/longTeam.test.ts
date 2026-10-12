import { loadScenario } from '@founder-mode/content'
import { createGame, emptyPlan, getView } from '@founder-mode/engine'
import { describe, expect, it } from 'vitest'
import { buildReport } from '../src/report'
import { runGame, type RunResult } from '../src/simulate'
import { strategyOf } from '../src/specs'
import { STRATEGIES } from '../src/strategies'
import { PlanBuilder, describeStrategy } from '../src/strategy'
import { TEAM_VARIANTS, validateThenBuild } from '../src/strategies/validateThenBuild'

const long = loadScenario('kantino', 'long')
const byId = (id: string) => STRATEGIES.find((s) => s.id === id)!

describe('long mode team rules', () => {
  it('lists the team variants for long mode only', () => {
    for (const v of TEAM_VARIANTS) expect(byId(v.id).modes).toEqual(['long'])
    expect(validateThenBuild.modes).toBeUndefined()
    expect(describeStrategy(validateThenBuild, long)).toContain(
      'In long mode it also builds a team',
    )
    expect(describeStrategy(validateThenBuild, loadScenario('kantino'))).not.toContain('long mode')
  })

  it('never hires in the 60 week game unless a hire rule says so', () => {
    const scenario = loadScenario('kantino')
    for (let i = 0; i < 6; i++) {
      const r = runGame(scenario, validateThenBuild, `team-std-${i}`)
      expect(r.hires).toEqual([])
      expect(r.at60).toBeNull()
      expect(r.year2Weeks).toBe(0)
    }
  })

  it('plays every variant with valid plans, and each follows its own rule', () => {
    const results = new Map<string, RunResult[]>()
    for (const id of ['validate_then_build', ...TEAM_VARIANTS.map((v) => v.id)]) {
      // runGame throws on an invalid plan.
      results.set(
        id,
        Array.from({ length: 12 }, (_, i) => runGame(long, byId(id), `team-${i}`)),
      )
    }
    const all = (id: string) => results.get(id)!
    expect(all('validate_then_build_solo').every((r) => r.hires.length === 0 && !r.freelance)).toBe(
      true,
    )
    // On savings: the first offer once building starts and the search is done.
    const firstOffers = all('validate_then_build_savings_hire').flatMap((r) => r.hires.slice(0, 1))
    expect(firstOffers.length).toBeGreaterThan(6)
    expect(firstOffers.every((h) => h.week >= 6 && h.role === 'developer')).toBe(true)
    expect(
      all('validate_then_build_part_time')
        .flatMap((r) => r.hires)
        .every((h) => h.partTime),
    ).toBe(true)
    expect(
      all('validate_then_build')
        .flatMap((r) => r.hires)
        .every((h) => !h.partTime),
    ).toBe(true)
    expect(all('validate_then_build_freelance_first').some((r) => r.freelance !== null)).toBe(true)
    for (const r of all('validate_then_build')) {
      expect(r.at60).not.toBeNull()
      expect(r.teamAtEnd).toBeLessThanOrEqual(4)
      // No hire in the last 26 weeks: the offer comes at least 26 weeks before the end, less the
      // search and start weeks.
      for (const h of r.hires) expect(h.week).toBeLessThanOrEqual(104 - 26 - 2 + 1)
    }
  })

  it('leaves the hours a working team takes out of the bot budget', () => {
    const view = getView(createGame(long, 'budget'))
    const team = {
      ...view.team,
      members: [1, 2].map((n) => ({
        id: `m${n}`,
        name: 'X',
        role: 'salesperson' as const,
        roleName: 'Salesperson',
        monthlyCents: 1,
        weeklyHours: 40,
        partTime: false,
        startWeek: 1,
        working: true,
        letGoCostCents: 0,
        managementHours: 2,
      })),
    }
    expect(new PlanBuilder(view, 50).free).toBe(50)
    expect(new PlanBuilder({ ...view, team }, 50).free).toBe(46)
    expect(emptyPlan().searchPartTime).toBeUndefined()
  })

  it('reports targets 20 to 30, the team and the year 2 split in long mode', () => {
    const runs = (id: string, spec = byId(id)) =>
      Array.from({ length: 6 }, (_, i) => runGame(long, spec, `rep-${i}`))
    const asRuns = (id: string, results: RunResult[]) => ({
      id,
      description: id,
      results,
      seconds: 1,
    })
    const report = buildReport({
      engineVersion: 'x',
      runs: 6,
      seedPrefix: 'rep',
      maxWeeks: 104,
      strategies: [asRuns('validate_then_build', runs('validate_then_build'))],
      extras: [
        asRuns('validate_then_build inbox:reader', runs('validate_then_build')),
        asRuns(
          'team:validate_then_build_solo',
          runs('', strategyOf({ kind: 'team', id: 'validate_then_build_solo' })),
        ),
        asRuns('energy:50h', runs('', strategyOf({ kind: 'energy', budget: 50 }))),
      ],
    })
    expect(report).toContain('## Targets (long mode)')
    for (const id of [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30])
      expect(report).toMatch(new RegExp(`\\n\\| ${id} \\|`))
    expect(report).toContain('## The team (long mode)')
    expect(report).toContain('## The hire can pay (target 29)')
    expect(report).toContain('## Year 2 (target 28)')
    expect(report).toContain('## Energy curve')
    expect(report).not.toContain('## Targets (plan section 7)')
  })
})
