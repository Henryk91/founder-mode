import { loadScenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek, getView } from '../src/index'
import { plan } from './helpers'
import { turnedAwayWeeks } from '../src/systems/bookings'

// Plan 8 step 2: money rules and screens that misled in the QA runs (G-06, G-04).

describe('a venue that has not opened', () => {
  it('does not count guests turned away before it opened (G-06)', () => {
    const s0 = createGame(loadScenario('griffig', 'long'), 'g06')
    const away = [3, 4, 5, 6].map((week) => ({ week, segmentId: 'students', units: 4 }))
    const state = (opening: number | null) => ({
      ...s0,
      week: 8,
      bookings: {
        ...s0.bookings!,
        turnedAway: away,
        leisure: { ...s0.bookings!.leisure!, openingWeek: opening },
      },
    })
    expect(turnedAwayWeeks(state(null))).toBe(0)
    expect(turnedAwayWeeks(state(5))).toBe(2)
    expect(turnedAwayWeeks(state(1))).toBe(4)
  })
})

describe('the header after a run has ended', () => {
  it('counts the week played last (G-04)', () => {
    const s0 = createGame(loadScenario('hinterhof', 'long'), 'g04')
    const served = {
      id: 'b1',
      segmentId: 'tourists',
      productId: Object.keys(s0.scenario.bookings!.products)[0]!,
      week: 6,
      units: 7,
      priceCents: 1000,
      channel: 'direct' as const,
      bookedWeek: 1,
      status: 'served' as const,
    }
    const base = { ...s0, week: 6, bookings: { ...s0.bookings!, bookings: [served] } }
    const running = getView(base).bookings!.servedByWeek
    const ended = getView({ ...base, status: 'ended', ending: 'bankrupt' }).bookings!.servedByWeek
    expect(running.reduce((a, b) => a + b, 0)).toBe(0)
    expect(ended.at(-1)).toBe(7)
  })
})

describe('the load history of a venue', () => {
  it('has no rows for services that are closed or not built (G-03)', () => {
    let s = createGame(loadScenario('griffig', 'long'), 'g03')
    for (let i = 0; i < 3; i++) s = endWeek(s, plan()).state
    const rows = s.bookings!.leisure!.weeks.flatMap((w) => w.slots)
    expect(rows.filter((r) => r.visits === 0 && r.turnedAway === 0)).toEqual([])
  })
})
