import { describe, expect, it } from 'vitest'
import { endWeek, getView } from '../src/index'
import { newGame, plan, quietKantino } from './helpers'

const quiet = (seed = 'screens') => newGame(seed, quietKantino())

describe('Plan 8 batch 1 view data', () => {
  it('K7: an accepted offer is reported with the start week', () => {
    let s = endWeek(quiet('k7'), plan({ searchRole: 'developer' })).state
    s = endWeek(s, plan({})).state
    s = endWeek(s, plan({})).state
    const pick = s.team.candidates[0]!
    const r = endWeek(s, plan({ hire: pick.id }))
    expect(r.report.entries).toContainEqual({
      kind: 'hire_agreed',
      name: pick.name,
      role: 'developer',
      startWeek: s.week + 2,
    })
  })

  it('K24: an open message says what its default costs', () => {
    let s = newGame('k24')
    let found = false
    for (let i = 0; i < 30 && !found; i++) {
      s = endWeek(s, plan({})).state
      const v = getView(s)
      found = v.inbox.some((m) => m.ifIgnored)
      for (const m of v.inbox) {
        if (m.ifIgnored) {
          expect(
            m.ifIgnored.costCents + m.ifIgnored.monthlyCostCents + m.ifIgnored.lostHours,
          ).toBeGreaterThan(0)
          expect(m.choices.some((c) => c.label === m.ifIgnored!.label)).toBe(true)
        }
      }
    }
    expect(found).toBe(true)
  })

  it('K10: only a committed lead carries a deposit', () => {
    const v = getView(quiet('k10'))
    for (const l of v.leads) {
      if (l.stage !== 'committed') expect(l.deposit).toBeNull()
    }
  })
})
