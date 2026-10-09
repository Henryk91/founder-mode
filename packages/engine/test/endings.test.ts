import { describe, expect, it } from 'vitest'
import { endWeek, getView, replay, shutDown, toSave, validatePlan } from '../src/index'
import { checkEnding } from '../src/systems/endings'
import { newGame, plan, play, richKantino, quietKantino } from './helpers'

describe('endings', () => {
  it('goes bankrupt with Kantino values when nothing earns money', () => {
    const s = play(newGame('broke', quietKantino()), 200, () => plan())
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

  it('burns out after 3 weeks in a row at 0 energy', () => {
    const s = play(newGame('burn', richKantino()), 20, () =>
      plan({ interviews: { coworking: 32 } }),
    )
    // 80 energy, -28 a week at 64 h: 0 after week 3, burnout at the end of week 5.
    expect(s.ending).toBe('burnout')
    expect(s.week).toBe(5)
    expect(s.founder.weeksAtZeroEnergy).toBe(3)
    expect(checkEnding(s)).toBe('burnout')
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

  describe('shut down', () => {
    it('ends the run on purpose, in the week the player is in', () => {
      const s = play(newGame('quit'), 5, () => plan())
      const end = shutDown(s)
      expect(end.status).toBe('ended')
      expect(end.ending).toBe('shut_down')
      expect(end.week).toBe(s.week)
      expect(getView(end)).toMatchObject({ status: 'ended', ending: 'shut_down' })
      expect(end.actionLog.at(-1)).toEqual({ type: 'shutDown', week: 6 })
    })

    it('does not mutate its input, and cannot end a finished run', () => {
      const s = newGame('quit2')
      const before = JSON.stringify(s)
      const end = shutDown(s)
      expect(JSON.stringify(s)).toBe(before)
      expect(() => shutDown(end)).toThrow()
      expect(validatePlan(end, plan())).toEqual([{ code: 'game_over' }])
      expect(() => endWeek(end, plan())).toThrow()
    })

    it('keeps the money as it is, whatever it was', () => {
      const s = play(newGame('quit3'), 3, () => plan())
      const end = shutDown(s)
      expect(end.company.cashCents).toBe(s.company.cashCents)
      expect(end.founder.savingsCents).toBe(s.founder.savingsCents)
    })

    it('is saved and replays to the same ending', () => {
      const end = shutDown(play(newGame('quit4'), 4, () => plan()))
      expect(replay(end.scenario, toSave(end))).toEqual(end)
      expect(replay(end.scenario, JSON.parse(JSON.stringify(toSave(end)))).ending).toBe('shut_down')
    })
  })
})
