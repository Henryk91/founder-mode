import { loadScenario, type Scenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek, getView, validatePlan } from '../src/index'
import { profitableOverMonths } from '../src/systems/finance'
import { hoursByActivity } from '../src/systems/founder'
import type { BookingsPlan, GameState, WeekPlan } from '../src/types'
import { deepFreeze, plan } from './helpers'

// Plan 2 step 1: the spec features of the tourism scenarios (trials, vouchers, contracts, prep
// and waste, kitchen and floor, renovation per room, minimum stay).

const ok = (s: GameState, p: WeekPlan) => validatePlan(s, p).length === 0

const cache = new Map<string, Scenario>()
const scenario = (id: 'gratwanderung' | 'hinterhof' | 'seeblick'): Scenario => {
  if (!cache.has(id)) cache.set(id, deepFreeze(loadScenario(id)))
  return cache.get(id)!
}
/** A scenario where no inbox message arrives, so tests see only the system under test. */
const quiet = (id: 'gratwanderung' | 'hinterhof' | 'seeblick'): Scenario => {
  const s = scenario(id)
  return { ...s, inbox: { ...s.inbox, drawChance: 0, guaranteeBelowOpen: 0 } }
}

/** With enough money to play a long while without guests. */
const rich = (id: 'gratwanderung' | 'hinterhof' | 'seeblick'): Scenario => {
  const s = quiet(id)
  return { ...s, start: { ...s.start, cashCents: 100_000_000 } }
}

const bp = (over: Partial<BookingsPlan>): Partial<WeekPlan> => ({
  bookings: {
    shifts: {},
    founderShifts: {},
    prices: {},
    policy: null,
    platform: null,
    partnerships: [],
    outreach: {},
    ...over,
  },
})

/** Ships features at once (a test shortcut). */
function ship(s: GameState, ids: string[]): GameState {
  return {
    ...s,
    product: {
      ...s.product,
      features: [
        ...s.product.features.filter((f) => !ids.includes(f.id)),
        ...ids.map((id) => ({ id, progressHours: 1000, shippedWeek: 0 })),
      ],
    },
  }
}

function playWeeks(s: GameState, n: number, p: Partial<WeekPlan> = {}): GameState {
  let state = s
  for (let i = 0; i < n && state.status === 'running'; i++) state = endWeek(state, plan(p)).state
  return state
}

describe('trials (plan 2 step 1a)', () => {
  it('replaces landing tests and pre-sales in tourism, and costs hours and money', () => {
    const s = createGame(quiet('gratwanderung'), 'trial-1')
    expect(ok(s, plan({ landing: { tourists: 20_000 } }))).toBe(false)
    expect(ok(s, plan({ presales: { tourists: 1 } }))).toBe(false)
    const p = plan(bp({ trials: [{ id: 'pilot_day', segmentId: 'tourists' }] }))
    expect(ok(s, p)).toBe(true)
    expect(hoursByActivity(s, p).learning).toBe(10)
    // A trial where the player picks a segment needs one it reaches; one that reaches all, none.
    expect(ok(s, plan(bp({ trials: [{ id: 'pilot_day', segmentId: null }] })))).toBe(false)
    expect(ok(s, plan(bp({ trials: [{ id: 'test_listing', segmentId: 'tourists' }] })))).toBe(false)
    const after = endWeek(s, p).state
    expect(after.company.cashCents).toBeLessThan(s.company.cashCents)
  })

  it('reports per segment when due, mostly from the segments it reaches', () => {
    const s = createGame(quiet('gratwanderung'), 'trial-2')
    let state = endWeek(s, plan(bp({ trials: [{ id: 'test_listing', segmentId: null }] }))).state
    expect(getView(state).pendingExperiments.some((e) => e.kind === 'trial')).toBe(true)
    state = playWeeks(state, 2)
    const v = getView(state)
    const people = Object.fromEntries(
      v.segments.map((x) => [x.id, (x.trials ?? []).reduce((t, r) => t + r.people, 0)]),
    )
    expect(people.tourists).toBe(204)
    expect(people.team_events).toBe(24)
    expect(people.school_groups).toBe(12)
    expect(v.pendingExperiments).toHaveLength(0)
  })

  it('a pilot day for tourists leaves a review and stops at its limit per segment', () => {
    const s = createGame(quiet('gratwanderung'), 'trial-3')
    const p = plan(bp({ trials: [{ id: 'pilot_day', segmentId: 'tourists' }] }))
    let state = endWeek(s, p).state
    state = endWeek(state, plan()).state
    expect(state.bookings!.reviews).toBe(1)
    state = endWeek(state, p).state
    expect(ok(state, p)).toBe(false)
    expect(ok(state, plan(bp({ trials: [{ id: 'pilot_day', segmentId: 'school_groups' }] })))).toBe(
      true,
    )
  })

  it('runs a trial before opening only', () => {
    const s = ship(createGame(quiet('hinterhof'), 'trial-4'), ['fit_out'])
    expect(ok(s, plan(bp({ trials: [{ id: 'lunch_test', segmentId: null }] })))).toBe(false)
    expect(getView(s).bookings!.trials.find((t) => t.id === 'lunch_test')!.open).toBe(false)
  })
})

describe('vouchers (plan 2 step 1a)', () => {
  it('bring cash that is not revenue, and are redeemed later as bookings that pay nothing', () => {
    let state = ship(createGame(rich('gratwanderung'), 'voucher-1'), [
      'half_day_hike',
      'english_tours',
      'online_booking',
    ])
    state = endWeek(state, plan(bp({ vouchers: { tourists: 4 } }))).state
    state = endWeek(state, plan()).state
    const sold = state.bookings!.vouchers ?? []
    expect(sold.length).toBeGreaterThan(0)
    const ledger = state.ledger.at(-1)!
    expect(ledger.voucherCents).toBe(sold.reduce((t, v) => t + v.valueCents, 0))
    expect(ledger.revenueCents).toBe(0)
    expect(getView(state).bookings!.vouchers!.openCount).toBe(sold.length)
    // Their guests come later; enough guides for every week.
    const guides = bp({ shifts: { hiking_leader: 3 } })
    let redeemed = 0
    for (let i = 0; i < 40 && state.status === 'running'; i++) {
      const r = endWeek(state, plan(guides))
      state = r.state
      redeemed += state.ledger.at(-1)!.voucherRedeemedCents ?? 0
    }
    expect(redeemed).toBeGreaterThan(0)
    const v = getView(state).bookings!.vouchers!
    expect(v.redeemed).toBeGreaterThan(0)
    expect(v.openCount + v.redeemed).toBe(sold.length)
    expect(
      state.bookings!.bookings.filter((b) => b.voucherId && b.status === 'served').length,
    ).toBeGreaterThan(0)
  })

  it('count a redeemed voucher as earned in the win test', () => {
    const s = createGame(quiet('gratwanderung'), 'voucher-2')
    const week = (over: object) => ({ ...s.ledger[0], ...over }) as GameState['ledger'][number]
    const base = {
      week: 1,
      revenueCents: 0,
      fixedCostsCents: 0,
      livingCostsCents: 100,
      founderDrawCents: 0,
      transferCents: 0,
      autoTransferCents: 0,
      adSpendCents: 0,
      freelanceCents: 0,
      otherCostsCents: 0,
      otherIncomeCents: 0,
      investmentCents: 0,
      bookingRevenueCents: 0,
      bookingCostsCents: 0,
      loanInCents: 0,
      loanPrincipalCents: 0,
      loanInterestCents: 0,
      loanFeeCents: 0,
    }
    const ledger = Array.from({ length: 4 }, () => week({ ...base, voucherRedeemedCents: 100 }))
    expect(profitableOverMonths({ ...s, ledger }, 1)).toBe(true)
    const sold = Array.from({ length: 4 }, () => week({ ...base, voucherCents: 100 }))
    expect(profitableOverMonths({ ...s, ledger: sold }, 1)).toBe(false)
  })
})

describe('contracts (plan 2 step 1b)', () => {
  it('pay every week, add shifts, and end after notice', () => {
    const s = createGame(quiet('gratwanderung'), 'contract-1')
    const hire = plan(bp({ hire: [{ roleId: 'hiking_leader', kind: 'permanent' }] }))
    expect(ok(s, hire)).toBe(true)
    let state = endWeek(s, hire).state
    expect(state.ledger.at(-1)!.bookingCostsCents).toBe(65_000)
    const v = getView(state).bookings!
    expect(v.contracts).toHaveLength(1)
    expect(v.roles.find((r) => r.id === 'hiking_leader')!.contracts[0]!.running).toBe(1)
    const id = v.contracts[0]!.id
    state = endWeek(state, plan(bp({ endContracts: [id] }))).state
    expect(state.bookings!.contracts![0]!.endWeek).toBe(state.week - 1 + 4)
    state = playWeeks(state, 4)
    expect(state.ledger.at(-1)!.bookingCostsCents).toBe(65_000)
    state = playWeeks(state, 1)
    expect(state.ledger.at(-1)!.bookingCostsCents).toBe(0)
    expect(getView(state).bookings!.contracts).toHaveLength(0)
  })

  it('a seasonal contract waits for its months and cannot be ended', () => {
    // Week 1 is early March; the guides' season is June to September.
    const s = createGame(quiet('gratwanderung'), 'contract-2')
    let state = endWeek(s, plan(bp({ hire: [{ roleId: 'guide', kind: 'seasonal' }] }))).state
    expect(state.ledger.at(-1)!.bookingCostsCents).toBe(0)
    const c = getView(state).bookings!.contracts[0]!
    expect(c.canEnd).toBe(false)
    expect(c.working).toBe(false)
    expect(ok(state, plan(bp({ endContracts: [c.id] })))).toBe(false)
    state = playWeeks(state, 14)
    expect(getView(state).bookings!.contracts[0]!.working).toBe(true)
    // It ends with September.
    expect(c.endWeek).toBeGreaterThan(25)
    expect(c.endWeek).toBeLessThan(32)
  })

  it('no more than the role allows', () => {
    const s = createGame(quiet('gratwanderung'), 'contract-3')
    const k = { roleId: 'guide', kind: 'permanent' as const }
    expect(ok(s, plan(bp({ hire: [k, k] })))).toBe(true)
    expect(ok(s, plan(bp({ hire: [k, k, k] })))).toBe(false)
  })
})

describe('prep, kitchen and floor (plan 2 step 1c)', () => {
  const open = (seed: string) =>
    ship(createGame(quiet('hinterhof'), seed), ['fit_out', 'fast_lunch', 'card_payment'])

  it('turns guests away beyond what was prepared, and throws away what was not served', () => {
    let short = open('prep-1')
    let wasteful = open('prep-1')
    const staff = { cook: 4, server: 4, helper: 0 }
    let soldOut = 0
    let waste = 0
    for (let i = 0; i < 6; i++) {
      const a = endWeek(short, plan(bp({ shifts: staff, prep: { fast_lunch: 20 } })))
      short = a.state
      for (const e of a.report.entries)
        if (e.kind === 'company_cancelled' && e.reason === 'sold_out') soldOut += e.units
      const b = endWeek(wasteful, plan(bp({ shifts: staff, prep: { fast_lunch: 400 } })))
      wasteful = b.state
      for (const e of b.report.entries) if (e.kind === 'food_waste') waste += e.units
    }
    expect(soldOut).toBeGreaterThan(0)
    expect(waste).toBeGreaterThan(0)
    expect(getView(short).bookings!.prep).toEqual([
      { productId: 'fast_lunch', units: 20 },
      { productId: 'dinner_menu', units: null },
      { productId: 'open_sundays', units: null },
      { productId: 'courtyard', units: null },
    ])
  })

  it('a kitchen without a floor serves only a little more than the floor can carry', () => {
    let state = open('floor-1')
    let served = 0
    for (let i = 0; i < 6; i++) {
      const r = endWeek(state, plan(bp({ shifts: { cook: 4, server: 0 } })))
      state = r.state
      for (const e of r.report.entries) if (e.kind === 'guests_served') served += e.units
    }
    expect(served).toBe(0)
    expect(getView(state).bookings!.roles.find((r) => r.id === 'server')!.kind).toBe('floor')
  })
})

describe('renovation and minimum stay (plan 2 step 1d)', () => {
  it('closes a room for three weeks, then counts it renovated', () => {
    const s = ship(createGame(quiet('seeblick'), 'reno-1'), ['rooms', 'renovated_rooms'])
    const v0 = getView(s).bookings!
    expect(v0.renovation!.canStart).toBe(3)
    expect(ok(s, plan(bp({ renovate: 4 })))).toBe(false)
    let state = endWeek(s, plan(bp({ renovate: 2 }))).state
    expect(state.ledger.at(-1)!.bookingCostsCents).toBeGreaterThanOrEqual(2_000_000)
    const cal = getView(state).bookings!.calendar.find((c) => c.productId === 'rooms')
    // Two rooms closed for this week and the next two.
    expect(cal?.cells[0]!.capacity).toBe(84 - 14)
    state = playWeeks(state, 3)
    expect(state.bookings!.renovated).toBe(2)
    expect(getView(state).bookings!.renovation!.underWorks).toBe(0)
  })

  it('needs the renovation planned first', () => {
    const s = createGame(quiet('seeblick'), 'reno-2')
    expect(ok(s, plan(bp({ renovate: 1 })))).toBe(false)
  })

  it('a minimum stay is a setting the house keeps', () => {
    const s = createGame(quiet('seeblick'), 'stay-1')
    expect(getView(s).bookings!.minStay).toMatchObject({ on: false, nights: 2 })
    const state = endWeek(s, plan(bp({ minStay: true }))).state
    expect(getView(state).bookings!.minStay!.on).toBe(true)
    expect(ok(createGame(quiet('hinterhof'), 'x'), plan(bp({ minStay: true })))).toBe(false)
  })
})
