import { describe, expect, it } from 'vitest'
import { endWeek, getView, validatePlan } from '../src/index'
import { newGame, plan, quietKantino } from './helpers'

const quiet = () => newGame('books', quietKantino())

describe('bookkeeping', () => {
  it('piles up 2 h a week when nobody does it', () => {
    let s = quiet()
    for (let i = 0; i < 3; i++) s = endWeek(s, plan()).state
    expect(s.company.bookkeepingBacklogHours).toBe(6)
    expect(getView(s).bookkeeping).toMatchObject({
      backlogHours: 6,
      requiredHoursPerWeek: 2,
      limitHours: 12,
      maxHours: 8,
    })
  })

  it('stays at zero for 2 h a week, and hours can work off a backlog', () => {
    let s = quiet()
    for (let i = 0; i < 6; i++) s = endWeek(s, plan({ bookkeepingHours: 2 })).state
    expect(s.company.bookkeepingBacklogHours).toBe(0)
    s = endWeek(s, plan()).state
    s = endWeek(s, plan()).state
    expect(s.company.bookkeepingBacklogHours).toBe(4)
    s = endWeek(s, plan({ bookkeepingHours: 6 })).state
    expect(s.company.bookkeepingBacklogHours).toBe(0)
  })

  it('does not accept more hours than there is to do', () => {
    const s = quiet()
    expect(validatePlan(s, plan({ bookkeepingHours: 2 }))).toEqual([])
    expect(validatePlan(s, plan({ bookkeepingHours: 3 }))).toEqual([
      { code: 'bookkeeping_exceeds_backlog', maxHours: 2 },
    ])
  })

  it('fires a penalty above 12 h: a late fee, 4 h lost next week, and the books are cleared', () => {
    let s = quiet()
    for (let i = 0; i < 6; i++) s = endWeek(s, plan()).state
    expect(s.company.bookkeepingBacklogHours).toBe(12)
    const cash = s.company.cashCents
    const r = endWeek(s, plan())
    expect(r.report.entries).toContainEqual({
      kind: 'bookkeeping_penalty',
      feeCents: 15_000,
      lostHours: 4,
    })
    expect(r.report.ledger.otherCostsCents).toBe(15_000)
    // Week 7 is not a month end, so the fee is the only cost of the company.
    expect(r.state.company.cashCents).toBe(cash - 15_000)
    expect(r.state.company.bookkeepingBacklogHours).toBe(0)
    expect(r.state.eventLog).toContainEqual({
      kind: 'bookkeeping_penalty',
      week: 7,
      feeCents: 15_000,
    })

    const next = getView(r.state)
    expect(next.forcedHours).toBe(4)
    expect(validatePlan(r.state, plan({ restHours: 61 }))).toEqual([])
    expect(validatePlan(r.state, plan({ restHours: 62 }))).toEqual([
      { code: 'too_many_hours', plannedHours: 66, maxHours: 65 },
    ])
    // The lost hours count as worked hours, then the week after is free again.
    const after = endWeek(r.state, plan({ bookkeepingHours: 2 }))
    expect(after.report.plannedHours).toBe(6)
    expect(getView(after.state).forcedHours).toBe(0)
  })
})
