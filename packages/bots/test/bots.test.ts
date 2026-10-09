import { loadScenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { buildReport, evaluateTargets, marketSpread, median, winRateByMarket } from '../src/report'
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
      'price_aware',
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
    const targets = evaluateTargets(input)
    expect(targets.map((t) => t.id)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(targets.filter((t) => !t.tuned).map((t) => t.id)).toEqual([6, 7])
    const md = buildReport(input)
    expect(md).toContain('# Balancing report')
    for (const heading of [
      '## Price aware against plain',
      '## Week the run ended',
      '## Losing runs: what they earned',
      '## First paying customer',
    ]) {
      expect(md).toContain(heading)
    }
    expect(md).toContain('(not tuned yet)')
    expect(md).toContain('| validate_then_build |')
    expect(md).not.toContain('NaN')
  })

  it('the price aware bot raises its price when trials convert, and never below one step', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'price_aware')!
    const prices = Array.from({ length: 20 }, (_, i) => runGame(scenario, strategy, `p${i}`)).map(
      (r) => r.finalPriceCents,
    )
    expect(Math.max(...prices)).toBeGreaterThan(scenario.start.priceCentsPerMonth)
    expect(Math.min(...prices)).toBeGreaterThan(0)
  })

  it('records the first customer week and what a run earned', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'validate_then_build')!
    const runs = Array.from({ length: 10 }, (_, i) => runGame(scenario, strategy, `f${i}`))
    for (const r of runs) {
      if (r.firstCustomerWeek === null) expect(r.peakCustomers).toBe(0)
      else expect(r.peakCustomers).toBeGreaterThan(0)
      if (r.revenueReceivedCents > 0) expect(r.firstCustomerWeek).not.toBeNull()
    }
  })

  it('measures the spread of win rates across viable markets', () => {
    const base = runGame(scenario, STRATEGIES[0]!, 'x')
    const run = (viableSegment: string, ending: 'sustainable' | 'bankrupt') => ({
      ...base,
      viableSegment,
      ending,
    })
    const results = [run('a', 'sustainable'), run('a', 'bankrupt'), run('b', 'bankrupt')]
    expect(winRateByMarket(results, ['a', 'b']).map((x) => x.rate)).toEqual([50, 0])
    expect(marketSpread(results)).toBe(50)
  })

  it('validate_then_build tests demand, runs pre-sales, and keeps the books and the invoices tidy', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'validate_then_build')!
    const runs = Array.from({ length: 20 }, (_, i) => runGame(scenario, strategy, `p4-${i}`))
    for (const r of runs) {
      expect(r.landingTests).toBe(3)
      expect(r.bookkeepingPenalties).toBe(0)
    }
    expect(runs.some((r) => r.presaleBatches > 0)).toBe(true)
    expect(runs.some((r) => r.invoicesIssued > 0)).toBe(true)
  })

  it('random answers about half of its messages, the others ignore the inbox', () => {
    const random = runGame(
      scenario,
      STRATEGIES.find((s) => s.id === 'random')!,
      'inbox',
    )
    expect(random.messages).toBeGreaterThan(5)
    expect(random.messagesAnswered).toBeGreaterThan(0)
    expect(random.messagesAnswered).toBeLessThan(random.messages)
    const buildOnly = runGame(
      scenario,
      STRATEGIES.find((s) => s.id === 'build_only')!,
      'inbox',
    )
    expect(buildOnly.messagesAnswered).toBe(0)
  })

  it('reports the Phase 4 systems and the shut down ending', () => {
    const strategies = STRATEGIES.map((s) => ({
      id: s.id,
      description: s.description,
      results: [runGame(scenario, s, 'q1'), runGame(scenario, s, 'q2')],
      seconds: 0.1,
    }))
    const md = buildReport({ engineVersion: 'x', runs: 2, seedPrefix: 'q', strategies })
    expect(md).toContain('## Phase 4 systems in use')
    expect(md).toContain('| Shut down |')
    expect(md).not.toContain('NaN')
  })

  it('computes medians', () => {
    expect(median([])).toBeNull()
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
  })
})
