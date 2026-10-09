import { describe, expect, it } from 'vitest'
import { createGame, endWeek, replay, toSave, type GameState } from '../src/index'
import { deepFreeze, kantino, newGame, play, plan, richKantino, scriptedPlan } from './helpers'

describe('determinism', () => {
  it('gives a deep equal state for the same seed and actions', () => {
    expect(play(newGame('same'), 30)).toEqual(play(newGame('same'), 30))
  })

  it('gives different runs for different seeds', () => {
    const a = play(newGame('seed-a'), 10)
    const b = play(newGame('seed-b'), 10)
    expect(a.hidden).not.toEqual(b.hidden)
  })

  it('does not depend on the key order of a plan', () => {
    const s = newGame('order')
    const a = endWeek(s, plan({ interviews: { medical: 2, coworking: 1 } }))
    const b = endWeek(s, plan({ interviews: { coworking: 1, medical: 2 } }))
    expect(a.state.knowledge).toEqual(b.state.knowledge)
    expect(a.state.rng).toEqual(b.state.rng)
  })
})

describe('replay', () => {
  it('rebuilds the same state from a save', () => {
    const s = play(newGame('replay'), 25)
    expect(replay(kantino(), toSave(s))).toEqual(s)
  })

  it('survives a JSON round trip of the save', () => {
    const s = play(newGame('json'), 12)
    const save = JSON.parse(JSON.stringify(toSave(s)))
    expect(replay(kantino(), save)).toEqual(s)
  })

  it('rejects saves from another engine version or scenario', () => {
    const save = toSave(play(newGame(), 2))
    expect(() => replay(kantino(), { ...save, engineVersion: '0.0.0' })).toThrow(/engine/)
    expect(() => replay(kantino(), { ...save, scenarioId: 'other' })).toThrow(/scenario/)
  })
})

describe('purity', () => {
  it('never mutates the input state', () => {
    let s = deepFreeze(newGame('frozen'))
    for (let i = 0; i < 20; i++) {
      const before = JSON.stringify(s)
      const next = endWeek(s, scriptedPlan(s)).state
      expect(JSON.stringify(s)).toBe(before)
      s = deepFreeze(next)
    }
  })
})

describe('full run', () => {
  it('a scripted game plays all 78 weeks', () => {
    let s: GameState = createGame(richKantino(), 'full-run')
    let weeks = 0
    while (s.status === 'running') {
      s = endWeek(s, scriptedPlan(s)).state
      weeks++
    }
    expect(weeks).toBe(78)
    expect(s.ending).toBe('still_searching')
    expect(s.actionLog).toHaveLength(78)
    expect(replay(richKantino(), toSave(s))).toEqual(s)
  })

  it('keeps invariants over many random runs', () => {
    for (let run = 0; run < 200; run++) {
      let s = newGame(`invariants-${run}`)
      // Deterministic pseudo random plans derived from the run number and week.
      while (s.status === 'running') {
        const w = s.week
        const segs = s.scenario.segments.map((x) => x.id)
        const before = s
        const r = endWeek(
          s,
          plan({
            interviews: { [segs[(run + w) % 3]!]: (run * 7 + w * 3) % 6 },
            restHours: (run + w * 5) % 20,
            transferToCompanyCents:
              w % 9 === 0 ? Math.min(50_000, Math.max(0, s.founder.savingsCents)) : 0,
          }),
        )
        s = r.state
        const l = r.report.ledger
        expect(s.founder.energy).toBeGreaterThanOrEqual(0)
        expect(s.founder.energy).toBeLessThanOrEqual(100)
        expect(s.founder.savingsCents).toBeGreaterThanOrEqual(0)
        expect(Number.isNaN(s.founder.skills.interviewing)).toBe(false)
        // Cash arithmetic: every cent is accounted for in the ledger.
        expect(s.company.cashCents).toBe(
          before.company.cashCents +
            l.revenueCents -
            l.fixedCostsCents -
            l.founderDrawCents +
            l.transferCents +
            l.autoTransferCents,
        )
        expect(s.founder.savingsCents).toBe(
          before.founder.savingsCents -
            (l.livingCostsCents - l.founderDrawCents) -
            l.transferCents -
            l.autoTransferCents,
        )
      }
      expect(s.ending).not.toBeNull()
    }
  })
})
