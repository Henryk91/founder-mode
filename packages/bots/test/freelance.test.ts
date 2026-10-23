import { loadScenario, SCENARIO_IDS } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { runGame } from '../src/simulate'
import { freelanceId, strategyOf, type StrategySpec } from '../src/specs'
import { validateThenBuild } from '../src/strategies/validateThenBuild'

const dev: StrategySpec = {
  kind: 'freelance',
  role: 'developer',
  hours: 20,
  centsPerHour: null,
  weeks: null,
}
const sales: StrategySpec = {
  kind: 'freelance',
  role: 'salesperson',
  hours: 10,
  centsPerHour: 0,
  weeks: 8,
}

describe('freelancer bots', () => {
  it.each(SCENARIO_IDS)('book a developer once, in week 2, in a funded %s fixture', (id) => {
    const scenario = loadScenario(id)
    // Isolate freelancer scheduling from an unfunded construction-stage shutdown.
    scenario.start.cashCents = Math.max(scenario.start.cashCents, 100000000)
    for (let i = 0; i < 8; i++) {
      const r = runGame(scenario, strategyOf(dev), `fl-${i}`)
      expect(r.freelance).not.toBeNull()
      expect(r.freelance!.bookedWeek).toBe(2)
      expect(r.freelance!.weeks).toBeGreaterThan(0)
      expect(r.freelance!.weeks).toBeLessThanOrEqual(12)
      expect(r.freelance!.costCents).toBe(r.freelance!.weeks * 20 * 6800)
    }
  })

  it('plays exactly like validate_then_build up to the booking', () => {
    const scenario = loadScenario('kantino')
    // Before a booking nothing differs, so a run that ends first is the same run.
    const a = runGame(scenario, validateThenBuild, 'fl-same')
    const b = runGame(scenario, strategyOf(dev), 'fl-same')
    expect(b.firstWeekSignal).toEqual(a.firstWeekSignal)
    expect(b.freelance?.bookedWeek).toBe(2)
  })

  it('can play a free salesperson for a fixed number of weeks', () => {
    const scenario = loadScenario('kantino')
    const strategy = strategyOf(sales)
    expect(strategy.id).toBe('freelance:salesperson 10h 8w at 0 EUR')
    expect(strategy.adapt!(scenario).team.freelance.roles.salesperson.centsPerHour).toBe(0)
    let booked = 0
    for (let i = 0; i < 6; i++) {
      const r = runGame(scenario, strategy, `fl-s-${i}`)
      if (!r.freelance) continue
      booked++
      expect(r.freelance.costCents).toBe(0)
      expect(r.freelance.workedHours).toBeLessThanOrEqual(4 + 7 * 9)
    }
    expect(booked).toBeGreaterThan(0)
  })

  it('names runs by role, hours, weeks and rate', () => {
    expect(freelanceId({ role: 'developer', hours: 20, centsPerHour: null, weeks: null })).toBe(
      'freelance:developer 20h',
    )
    expect(freelanceId({ role: 'developer', hours: 10, centsPerHour: 6000, weeks: null })).toBe(
      'freelance:developer 10h at 60 EUR',
    )
  })
})

describe('the tired founder (target 19 check)', () => {
  it('rents only once energy is low, and an overworker gets there', () => {
    const scenario = loadScenario('kantino')
    const spec = (budget: number): StrategySpec => ({
      kind: 'tired',
      budget,
      below: 40,
      rent: true,
    })
    expect(strategyOf(spec(65)).id).toBe('tired:65h rent below 40')
    let booked = 0
    for (let i = 0; i < 4; i++) {
      const r = runGame(scenario, strategyOf(spec(65)), `tired-${i}`)
      if (r.freelance) booked++
    }
    expect(booked).toBeGreaterThan(0)
    // The careful bot at 50 h stays fresh, so the rule leaves it alone.
    const calm = runGame(scenario, strategyOf(spec(50)), 'tired-calm')
    const plain = runGame(scenario, validateThenBuild, 'tired-calm')
    expect(calm.freelance).toBeNull()
    expect(calm.ending).toBe(plain.ending)
  })
})
