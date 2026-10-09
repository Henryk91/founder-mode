import { describe, expect, it } from 'vitest'
import { endWeek } from '../src/index'
import { applyFounderWeek, energyFactor, plannedHours } from '../src/systems/founder'
import { kantino, newGame, plan } from './helpers'

describe('founder', () => {
  const scenario = kantino()
  const founder = newGame().founder // energy 80
  const energyAfter = (hours: number, rest: number, energy = 80) =>
    applyFounderWeek({ ...founder, energy }, scenario, hours, rest).energy

  it('counts interview and rest hours', () => {
    expect(plannedHours(newGame(), plan({ interviews: { a: 3, b: 2 }, restHours: 4 }))).toBe(14)
  })

  it('gives +3 for a week within 50 hours', () => {
    expect(energyAfter(50, 0)).toBe(83)
  })

  it('costs 2 per hour above 50, with no base bonus', () => {
    expect(energyAfter(60, 0)).toBe(60)
  })

  it('restores 1.5 per rest hour', () => {
    expect(energyAfter(10, 10)).toBe(98)
    expect(energyAfter(55, 4)).toBe(76)
  })

  it('clamps to 0 and the maximum', () => {
    expect(energyAfter(65, 0, 10)).toBe(0)
    expect(energyAfter(40, 40, 95)).toBe(100)
  })

  it('counts weeks in a row that end at 0 and resets after a better week', () => {
    let f = { ...founder, energy: 10 }
    f = applyFounderWeek(f, scenario, 65, 0)
    expect(f).toMatchObject({ energy: 0, weeksAtZeroEnergy: 1 })
    f = applyFounderWeek(f, scenario, 65, 0)
    expect(f.weeksAtZeroEnergy).toBe(2)
    f = applyFounderWeek(f, scenario, 40, 0)
    expect(f).toMatchObject({ energy: 3, weeksAtZeroEnergy: 0 })
  })

  it('lowers sales chances gradually from the tired line down to the low energy line', () => {
    const { fullAt, lowBelow, lowFactor } = scenario.founder.energy
    expect(energyFactor({ ...founder, energy: fullAt }, scenario)).toBe(1)
    expect(energyFactor({ ...founder, energy: 100 }, scenario)).toBe(1)
    expect(energyFactor({ ...founder, energy: (fullAt + lowBelow) / 2 }, scenario)).toBeCloseTo(
      (1 + lowFactor) / 2,
      10,
    )
    expect(energyFactor({ ...founder, energy: lowBelow }, scenario)).toBe(lowFactor)
    expect(energyFactor({ ...founder, energy: lowBelow - 0.5 }, scenario)).toBe(lowFactor)
  })

  it('finds fewer leads when tired', () => {
    const leads = (energy: number) => {
      let total = 0
      for (let i = 0; i < 300; i++) {
        const s = newGame(`tired${i}`)
        const r = endWeek(
          { ...s, founder: { ...s.founder, energy } },
          plan({ outreach: { coworking: { channel: 'in_person', hours: 40 } } }),
        )
        total += r.state.leads.length
      }
      return total
    }
    // 40 h is within the base week, so energy only rises by the weekly bonus.
    const ratio = leads(10) / leads(80)
    expect(ratio).toBeGreaterThan(scenario.founder.energy.lowFactor - 0.08)
    expect(ratio).toBeLessThan(scenario.founder.energy.lowFactor + 0.08)
  })
})
