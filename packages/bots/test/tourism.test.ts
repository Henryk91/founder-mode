import { describe, expect, it } from 'vitest'
import { runGame } from '../src/simulate'
import { playsIn } from '../src/strategy'
import { STRATEGIES } from '../src/strategies'
import { TOURISM_STRATEGIES } from '../src/strategies/tourism'
import { tourismScenario } from '../../engine/test/tourism'
import { loadScenario } from '@founder-mode/content'

describe('tourism bots (step 4)', () => {
  const scenario = tourismScenario()

  it('play only the bookings model, and subscription bots never play it', () => {
    for (const t of TOURISM_STRATEGIES) {
      // The loan bots play only where a scenario offers a bank loan (step 6).
      expect(playsIn(t, scenario)).toBe(!t.needsLoan)
      expect(playsIn(t, loadScenario('hinterhof'))).toBe(true)
      expect(playsIn(t, loadScenario('kantino', 'long'))).toBe(false)
    }
    const validate = STRATEGIES.find((s) => s.id === 'validate_then_build')!
    expect(playsIn(validate, scenario)).toBe(false)
  })

  it.each(TOURISM_STRATEGIES.map((t) => [t.id, t] as const))(
    '%s plays complete runs with valid plans only',
    (_id, strategy) => {
      for (let i = 0; i < 3; i++) {
        // runGame throws on an invalid plan.
        const r = runGame(scenario, strategy, `tourism-${i}`)
        expect(r.weeks).toBeGreaterThan(0)
        expect(r.weeks).toBeLessThanOrEqual(scenario.maxWeeks)
      }
    },
  )

  it('makes money from guests when it plays carefully', () => {
    const careful = TOURISM_STRATEGIES.find((t) => t.id === 'tourism_careful')!
    const rs = Array.from({ length: 4 }, (_, i) => runGame(scenario, careful, `money-${i}`))
    expect(rs.some((r) => r.revenueReceivedCents > 0)).toBe(true)
  })
})

describe('the tourism report (step 4)', () => {
  it('judges the target template on the tourism bots', async () => {
    const { buildReport } = await import('../src/report')
    const { evaluateTourismTargets } = await import('../src/tourismReport')
    const scenario = tourismScenario()
    const strategies = TOURISM_STRATEGIES.map((s) => ({
      id: s.id,
      description: s.description,
      results: [runGame(scenario, s, 'rep-1'), runGame(scenario, s, 'rep-2')],
      seconds: 0.1,
    }))
    const input = {
      engineVersion: 'x',
      runs: 2,
      seedPrefix: 'rep',
      strategies,
      maxWeeks: 104,
      tourism: true,
    }
    expect(evaluateTourismTargets(input).map((t) => t.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ])
    const md = buildReport(input)
    expect(md).toContain('## Targets (tourism)')
    expect(md).toContain('## Guests (tourism)')
    expect(md).not.toContain('NaN')
  })
})
