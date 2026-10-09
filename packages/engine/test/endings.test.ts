import { describe, expect, it } from 'vitest'
import { endWeek } from '../src/index'
import { checkEnding } from '../src/systems/endings'
import { newGame, plan, play, richKantino } from './helpers'

describe('endings', () => {
  it('goes bankrupt with Kantino values when nothing earns money', () => {
    const s = play(newGame('broke'), 200, () => plan())
    expect(s.status).toBe('ended')
    expect(s.ending).toBe('bankrupt')
    // Cash and savings at about 517.50 EUR a week (living costs plus a quarter of fixed costs).
    const start = s.scenario.start
    const weeks = (start.cashCents + start.savingsCents) / 51_750
    expect(s.week).toBeGreaterThanOrEqual(Math.floor(weeks) - 2)
    expect(s.week).toBeLessThanOrEqual(Math.ceil(weeks) + 2)
    expect(s.founder.savingsCents).toBe(0)
    expect(s.company.cashCents).toBeLessThan(0)
  })

  it('ends at the week limit as still searching without revenue', () => {
    const s = play(newGame('limit', richKantino()), 200, () => plan())
    expect(s.ending).toBe('still_searching')
    expect(s.week).toBe(78)
    expect(s.ledger).toHaveLength(78)
  })

  it('reports the ending in the week it happens and stops the week counter', () => {
    const s = play(newGame('limit', richKantino()), 77, () => plan())
    expect(s.week).toBe(78)
    const { state, report } = endWeek(s, plan())
    expect(report.ending).toBe('still_searching')
    expect(report.week).toBe(78)
    expect(state.week).toBe(78)
  })

  it('reaches sustainable at the limit when the last two months were profitable', () => {
    const s = play(newGame('limit', richKantino()), 77, () => plan())
    const ledger = s.ledger.map((l) => ({ ...l, revenueCents: 100_000 }))
    expect(checkEnding({ ...s, week: 78, ledger: [...ledger, ledger[0]!] })).toBe('sustainable')
  })

  it('does not end a healthy run early', () => {
    expect(checkEnding(newGame())).toBeNull()
  })
})
