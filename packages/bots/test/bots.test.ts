import { loadScenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { buildReport, evaluateTargets, median } from '../src/report'
import { runGame } from '../src/simulate'
import { STRATEGIES } from '../src/strategies'

const scenario = loadScenario('kantino')

describe('bots', () => {
  it('has the five plan strategies plus the playtest replay', () => {
    expect(STRATEGIES.map((s) => s.id)).toEqual([
      'random',
      'build_only',
      'sell_first',
      'validate_then_build',
      'overworker',
      'playtest',
    ])
  })

  it.each(STRATEGIES.map((s) => [s.id, s] as const))(
    '%s plays complete runs with valid plans only',
    (_id, strategy) => {
      for (let i = 0; i < 5; i++) {
        const r = runGame(scenario, strategy, `test-${i}`)
        expect(['bankrupt', 'burnout', 'still_searching', 'sustainable']).toContain(r.ending)
        expect(r.weeks).toBeGreaterThan(0)
        expect(r.weeks).toBeLessThanOrEqual(scenario.maxWeeks)
      }
    },
  )

  it('is deterministic for a seed', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'random')!
    expect(runGame(scenario, strategy, 'same')).toEqual(runGame(scenario, strategy, 'same'))
  })

  it('build_only never finds a customer', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'build_only')!
    for (let i = 0; i < 5; i++) {
      expect(runGame(scenario, strategy, `b${i}`).customersEnd).toBe(0)
    }
  })

  it('the overworker plans 65 h a week and burns out', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'overworker')!
    const r = runGame(scenario, strategy, 'o')
    expect(r.meanPlannedHours).toBeGreaterThan(55)
    expect(r.ending).toBe('burnout')
  })

  it('builds a report with every target', () => {
    const strategies = STRATEGIES.map((s) => ({
      id: s.id,
      description: s.description,
      results: [runGame(scenario, s, 'r1'), runGame(scenario, s, 'r2')],
      seconds: 0.1,
    }))
    const input = { engineVersion: 'x', runs: 2, seedPrefix: 'r', strategies }
    expect(evaluateTargets(input).map((t) => t.id)).toEqual([1, 2, 3, 4, 5])
    const md = buildReport(input)
    expect(md).toContain('# Balancing report')
    expect(md).toContain('| validate_then_build |')
    expect(md).not.toContain('NaN')
  })

  it('computes medians', () => {
    expect(median([])).toBeNull()
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
  })
})
