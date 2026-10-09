import { describe, expect, it } from 'vitest'
import { applyFounderWeek, plannedHours } from '../src/systems/founder'
import { kantino, newGame, plan } from './helpers'

describe('founder', () => {
  const scenario = kantino()
  const founder = newGame().founder // energy 80
  const energyAfter = (hours: number, rest: number, energy = 80) =>
    applyFounderWeek({ ...founder, energy }, scenario, hours, rest).energy

  it('counts interview and rest hours', () => {
    expect(plannedHours(scenario, plan({ interviews: { a: 3, b: 2 }, restHours: 4 }))).toBe(14)
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
})
