import { describe, expect, it } from 'vitest'
import { createGame, getView } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { applyBookings, bookingsHours } from '../src/systems/bookings'
import {
  beginLeisure,
  leisureCapacity,
  leisureHours,
  leisureValid,
  cloneLeisurePlan,
} from '../src/systems/leisure'
import { hallCapacity } from '../src/systems/hall'
import { leisureScenario } from './leisure'
import { plan } from './helpers'
import type { BookingsPlan } from '../src/types'
const rng = () => new Rng(seedRng('hall-hours'))
function game() {
  const spec = leisureScenario({
    hall: {
      visitHours: 2,
      desk: { role: 'desk', hoursPerShift: 4 },
      setting: { role: 'setter', hoursPerShift: 8 },
    },
    products: {
      basic_ordering: { capacity: {}, simultaneous: { hard: 140, comfort: 80 } },
      allergy_filter: { capacity: {}, simultaneous: { hard: 60, comfort: 48 } },
    },
    freshness: {
      basic_ordering: {
        newAbove: 70,
        knownAbove: 30,
        weeklyLoss: 10,
        useLoss: 0,
        localSegments: [],
        sensitivity: {},
        refresh: { hours: 25, cents: 0, weeks: 0, closedHours: { daytime: 4 } },
      },
    },
  })
  for (const segment of Object.values(spec.bookings.segments)) segment.base = { min: 0, max: 0 }
  spec.bookings.roles.desk = {
    name: 'Front desk',
    centsPerShift: 7200,
    units: {},
    available: Array(12).fill(30),
    founderHours: 4,
    contracts: {
      part_time: { centsPerWeek: 24000, shifts: 4, noticeWeeks: 2, quality: 0, max: 2 },
    },
  }
  spec.bookings.roles.setter = {
    name: 'Route setter',
    centsPerShift: 25000,
    units: {},
    available: Array(12).fill(10),
  }
  const s = createGame(spec, 'hall-hours')
  s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  return s
}
const roster = (desk: number, setter = 0): BookingsPlan => ({
  shifts: { desk, setter },
  founderShifts: {},
  prices: {},
  policy: null,
  platform: null,
  partnerships: [],
  outreach: {},
})

describe('optional hall opening hours and setting crews', () => {
  it('converts simultaneous places to weekly visits and limits hours by actual desk cover', () => {
    const s = game(),
      before = structuredClone(s)
    const p = plan({ bookings: roster(1) })
    const r = beginLeisure(s, p, rng()).state
    expect(r.bookings!.leisure!.hall).toMatchObject({
      deskHours: 4,
      openHours: { daytime: 4, evening: 0 },
    })
    expect(leisureCapacity(r, 'basic_ordering', 'daytime', 1)).toBe(280)
    expect(leisureCapacity(r, 'basic_ordering', 'evening', 1)).toBe(0)
    expect(hallCapacity(r, 'basic_ordering', 'daytime', 1, true)).toBe(160)
    expect(s).toEqual(before)
    expect(beginLeisure(s, p, rng()).state).toEqual(r)
    const full = beginLeisure(s, plan({ bookings: roster(10) }), rng()).state
    expect(leisureCapacity(full, 'basic_ordering', 'evening', 1)).toBe(1400)
    expect(getView(full).bookings!.leisure!.hall!.deskHoursPerShift).toBe(4)
    expect(JSON.stringify(getView(full).bookings!.leisure!.hall)).not.toMatch(
      /comfort|simultaneous/,
    )
  })
  it('serves uncoached visits with admission cover and pays each shift once', () => {
    const s = game()
    s.bookings!.bookings = [
      {
        id: 'admission',
        productId: 'basic_ordering',
        segmentId: 'small_offices',
        week: 1,
        units: 10,
        priceCents: 1500,
        channel: 'direct',
        bookedWeek: 0,
        status: 'booked',
        slotId: 'daytime',
      },
    ]
    const r = applyBookings(s, plan({ bookings: roster(1) }), rng())
    expect(r.state.bookings!.bookings.find((b) => b.id === 'admission')!.status).toBe('served')
    expect(r.entries).toContainEqual({ kind: 'shifts_paid', shifts: 1, amountCents: 7200 })
    const closed = applyBookings(s, plan({ bookings: roster(0) }), rng())
    expect(closed.state.bookings!.bookings.find((b) => b.id === 'admission')!.status).toBe(
      'company_cancelled',
    )
  })
  it('counts new contracts this week and founder desk hours once', () => {
    const s = game(),
      b = roster(0)
    b.hire = [{ roleId: 'desk', kind: 'part_time' }]
    b.founderShifts = { desk: 1 }
    const p = plan({ bookings: b })
    const r = applyBookings(s, p, rng())
    expect(r.state.bookings!.leisure!.hall!.deskHours).toBe(20)
    expect(bookingsHours(s, p)).toBe(4)
    expect(r.entries.filter((e) => e.kind === 'contracts_paid')).toEqual([
      { kind: 'contracts_paid', contracts: 1, amountCents: 24000 },
    ])
    expect(r.state.bookings!.contracts).toHaveLength(1)
  })
  it('allocates paid setting hours once,adds founder work,and closes only the reset morning', () => {
    const s = game(),
      b = roster(10, 3)
    b.leisure = { settingHours: { basic_ordering: 5 }, paidSettingHours: { basic_ordering: 20 } }
    const p = plan({ bookings: b })
    expect(leisureValid(s, p)).toBe(true)
    expect(leisureHours(s, p)).toBe(5)
    const r = applyBookings(s, p, rng())
    expect(r.state.bookings!.leisure!.freshness.basic_ordering).toMatchObject({
      refreshes: 1,
      settingProgress: 0,
      lastRefreshWeek: 1,
    })
    expect(leisureCapacity(r.state, 'basic_ordering', 'daytime', 1)).toBe(1120)
    expect(leisureCapacity(r.state, 'basic_ordering', 'evening', 1)).toBe(1400)
    expect(r.entries).toContainEqual({ kind: 'shifts_paid', shifts: 13, amountCents: 147000 })
    const next = { ...r.state, week: 2 }
    const restored = beginLeisure(next, plan({ bookings: roster(10) }), rng()).state
    expect(leisureCapacity(restored, 'basic_ordering', 'daytime', 2)).toBe(1400)
    expect(restored.bookings!.leisure!.freshness.basic_ordering!.settingProgress).toBe(5)
    expect(restored.bookings!.leisure!.hall!.paidSettingHours).toEqual({})
  })
  it('rejects more paid setting than purchased cover and impossible opening hours', () => {
    const s = game(),
      b = roster(0, 1)
    b.leisure = { paidSettingHours: { basic_ordering: 9 } }
    expect(leisureValid(s, plan({ bookings: b }))).toBe(false)
    b.leisure = { openHours: { evening: 21 } }
    expect(leisureValid(s, plan({ bookings: b }))).toBe(false)
    b.leisure = { openHours: { daytime: 0, evening: 4 } }
    b.shifts = { desk: 1 }
    const r = beginLeisure(s, plan({ bookings: b }), rng()).state
    expect(r.bookings!.leisure!.hall!.openHours).toEqual({ daytime: 0, evening: 4 })
    const copy = cloneLeisurePlan(b.leisure)
    copy.openHours!.evening = 0
    expect(b.leisure.openHours!.evening).toBe(4)
  })
  it('adds mezzanine comfort without changing the safety limit', () => {
    const s = game(),
      stage = s.scenario.officeStages[1]!
    s.scenario.bookings!.leisure!.hall!.comfortByStage = { [stage.id]: 1.15 }
    s.company.officeStage = stage.id
    const r = beginLeisure(s, plan({ bookings: roster(10) }), rng()).state
    expect(hallCapacity(r, 'basic_ordering', 'daytime', 1, true)).toBe(920)
    expect(leisureCapacity(r, 'basic_ordering', 'daytime', 1)).toBe(1400)
  })
})
