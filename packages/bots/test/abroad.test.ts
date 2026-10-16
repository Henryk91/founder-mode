import { loadScenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { runGame } from '../src/simulate'
import { playsIn } from '../src/strategy'
import { TOURISM_STRATEGIES } from '../src/strategies/tourism'

// Plan 4: the abroad scenarios played by every tourism bot that plays in them.
describe('Rückenwind bots (plan 4 step 2)', () => {
  const scenario = loadScenario('rueckenwind', 'long')
  const bots = TOURISM_STRATEGIES.filter((t) => playsIn(t, scenario))

  it('plays every tourism bot and its own target bots', () => {
    const ids = bots.map((b) => b.id)
    for (const id of [
      'tourism_careful',
      'tourism_wind_only',
      'tourism_calm_only',
      'tourism_no_courses',
      'tourism_trips_always',
      'tourism_trips_never',
      'tourism_tender_higher',
      'tourism_tender_same',
      'tourism_efoil_spring',
    ]) {
      expect(ids).toContain(id)
    }
  })

  it.each(bots.map((t) => [t.id, t] as const))(
    '%s plays a complete run with valid plans',
    (_id, bot) => {
      // runGame throws on an invalid plan.
      const r = runGame(scenario, bot, 'abroad-0')
      expect(r.weeks).toBeGreaterThan(0)
      expect(r.tourism?.abroad).toBeDefined()
    },
  )

  it('runs trips, teaches courses and answers the tender when it plays carefully', () => {
    const careful = bots.find((b) => b.id === 'tourism_careful')!
    const rs = Array.from({ length: 6 }, (_, i) => runGame(scenario, careful, `careful-${i}`))
    expect(rs.some((r) => r.revenueReceivedCents > 0)).toBe(true)
    expect(rs.some((r) => (r.tourism?.abroad?.trips ?? 0) > 0)).toBe(true)
    expect(rs.some((r) => r.tourism?.abroad?.tender !== null)).toBe(true)
    const never = bots.find((b) => b.id === 'tourism_trips_never')!
    expect(runGame(scenario, never, 'careful-0').tourism?.abroad?.trips).toBe(0)
  })
})
