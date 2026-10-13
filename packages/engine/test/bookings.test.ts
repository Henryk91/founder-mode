import { loadScenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek, getView, validatePlan } from '../src/index'
import { guestsEconomics } from '../src/postmortem'
import { monthOfWeek, seasonAt, weekOfYear } from '../src/systems/bookings'
import type { BookingsPlan, GameState, WeekPlan } from '../src/types'
import { plan } from './helpers'
import { tourismScenario } from './tourism'

const game = (seed = 'tourism', over = {}) => createGame(tourismScenario(over), seed)

/** Ships products at once, as if built, so their bookings can start. */
function shipped(s: GameState, ids: string[]): GameState {
  return {
    ...s,
    product: {
      ...s.product,
      features: s.product.features.map((f) =>
        ids.includes(f.id) ? { ...f, progressHours: 999, shippedWeek: 0 } : f,
      ),
    },
  }
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

describe('the calendar', () => {
  it('maps run weeks to weeks and months of the year, and reads season curves between months', () => {
    const s = tourismScenario()
    expect(weekOfYear(s, 1)).toBe(10)
    expect(weekOfYear(s, 43)).toBe(52)
    expect(weekOfYear(s, 44)).toBe(1)
    expect(monthOfWeek(1)).toBe(1)
    expect(monthOfWeek(52)).toBe(12)
    const curve = [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0]
    expect(seasonAt(curve, 30)).toBeGreaterThan(0.9)
    expect(seasonAt(curve, 5)).toBe(0)
    expect(seasonAt([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 1)).toBeCloseTo(1)
  })
})

describe('the bookings model', () => {
  it('exists only in a bookings scenario, and shows no demand or true weather', () => {
    expect(getView(createGame(loadScenario('kantino', 'long'), 'x')).bookings).toBeNull()
    const view = getView(game()).bookings!
    expect(view.weekOfYear).toBe(10)
    expect(view.policy).toBe('flexible')
    expect(view.rating).toBeNull()
    const json = JSON.stringify(getView(game()))
    expect(json).not.toContain('nextWeather')
    expect(json).not.toContain('"base"')
    expect(json).not.toContain('season')
  })

  it('takes no bookings before a product ships', () => {
    let s = game()
    for (let i = 0; i < 3; i++) s = endWeek(s, plan(bp({ platform: true }))).state
    expect(s.bookings!.bookings).toHaveLength(0)
  })

  it('books shipped products ahead, turns guests away when full, and serves what the roster covers', () => {
    let s = shipped(game('busy'), ['basic_ordering', 'allergy_filter'])
    s = endWeek(s, plan(bp({ platform: true }))).state
    expect(s.bookings!.bookings.length).toBeGreaterThan(0)
    const view = getView(s).bookings!
    const cal = view.calendar.find((c) => c.productId === 'basic_ordering')!
    expect(cal.cells).toHaveLength(12)
    for (const c of cal.cells) expect(c.booked).toBeLessThanOrEqual(c.capacity)
    // A busy fortnight: demand beyond capacity is turned away and counted.
    for (let i = 0; i < 3; i++) s = endWeek(s, plan(bp({ shifts: { guide: 9 } }))).state
    expect(s.bookings!.turnedAway.length).toBeGreaterThan(0)
    const served = s.bookings!.bookings.filter((b) => b.status === 'served')
    expect(served.length).toBeGreaterThan(0)
    const l = s.ledger.at(-1)!
    expect(l.bookingCostsCents).toBeGreaterThanOrEqual(9 * 30_000)
  })

  it('turns guests an inbox answer sent into requests next turn, which need a product with room', () => {
    const sendTo = (st: GameState): GameState => ({
      ...st,
      bookings: { ...st.bookings!, eventGuests: { coworking: 5 } },
    })
    const count = (st: GameState) =>
      st.bookings!.bookings.filter((b) => b.segmentId === 'coworking').length
    const base = shipped(game('sent'), ['basic_ordering'])
    const without = endWeek(base, plan(bp({}))).state
    const withSent = endWeek(sendTo(base), plan(bp({}))).state
    expect(count(withSent)).toBe(count(without) + 5)
    expect(withSent.bookings!.eventGuests).toEqual({})
    // Nothing that serves them: they are turned away, and the reach does not grow.
    const none = endWeek(sendTo(game('sent')), plan(bp({}))).state
    expect(none.bookings!.turnedAway.some((t) => t.segmentId === 'coworking')).toBe(true)
    expect(none.bookings!.repeatGuests['coworking']).toBe(0)
    // They complain: a 2 star review per group sent and turned away.
    expect(none.bookings!.reviews).toBe(5)
    expect(none.bookings!.rating).toBe(2)
  })

  it('cancels guests the roster cannot cover, and the reviews say so', () => {
    let staffed = shipped(game('roster'), ['basic_ordering'])
    let empty = staffed
    for (let i = 0; i < 6; i++) {
      staffed = endWeek(staffed, plan(bp({ platform: true, shifts: { guide: 4 } }))).state
      empty = endWeek(empty, plan(bp({ platform: true }))).state
    }
    const cancelled = (s: GameState) =>
      s.bookings!.bookings.filter((b) => b.status === 'company_cancelled').length
    expect(cancelled(empty)).toBeGreaterThan(cancelled(staffed))
    expect(empty.bookings!.bookings.some((b) => b.status === 'served')).toBe(false)
    expect(staffed.bookings!.rating).not.toBeNull()
  })

  it('invoices business guests instead of taking cash on the day', () => {
    let s = shipped(game('invoice'), ['basic_ordering', 'allergy_filter'])
    for (let i = 0; i < 4; i++)
      s = endWeek(s, plan(bp({ platform: true, shifts: { guide: 9 } }))).state
    const medical = s.bookings!.bookings.filter(
      (b) => b.segmentId === 'medical' && b.status === 'served',
    )
    expect(medical.length).toBeGreaterThan(0)
    expect(s.invoices.some((i) => i.segmentId === 'medical')).toBe(true)
  })

  it('keeps cancelled bookings paid under a strict policy, and locks the policy for weeks', () => {
    let s = shipped(game('strict'), ['basic_ordering'])
    s = endWeek(s, plan(bp({ platform: true, policy: 'strict', shifts: { guide: 4 } }))).state
    expect(s.bookings!.policy).toBe('strict')
    expect(validatePlan(s, plan(bp({ policy: 'flexible' })))).toContainEqual({
      code: 'invalid_bookings',
    })
    for (let i = 0; i < 8; i++) s = endWeek(s, plan(bp({ shifts: { guide: 4 } }))).state
    expect(s.bookings!.bookings.some((b) => b.status === 'cancelled_paid')).toBe(true)
    expect(s.bookings!.bookings.some((b) => b.status === 'cancelled')).toBe(false)
  })

  it('closes weather-bound products on dangerous weeks unless an alternative has shipped', () => {
    const always = Array.from({ length: 12 }, () => ({ good: 0, mixed: 0, bad: 0, dangerous: 1 }))
    const base = tourismScenario().bookings!
    let s = shipped(game('storm', { weather: { ...base.weather, monthly: always } }), [
      'basic_ordering',
    ])
    for (let i = 0; i < 4; i++)
      s = endWeek(s, plan(bp({ platform: true, shifts: { guide: 9 } }))).state
    const statuses = s.bookings!.bookings.filter((b) => b.week < s.week).map((b) => b.status)
    expect(statuses.length).toBeGreaterThan(0)
    expect(statuses.every((x) => x === 'company_cancelled' || x === 'cancelled')).toBe(true)
  })

  it('refuses rosters beyond what is available and prices of nothing', () => {
    const s = game()
    expect(validatePlan(s, plan(bp({ shifts: { guide: 10 } })))).toContainEqual({
      code: 'invalid_bookings',
    })
    expect(validatePlan(s, plan(bp({ shifts: { guide: 9 } })))).toEqual([])
    expect(
      validatePlan(s, plan(bp({ prices: { coworking: { peak: 0, off: 100 } } }))),
    ).toContainEqual({ code: 'invalid_bookings' })
    // Founder shifts cost the founder's hours.
    expect(validatePlan(s, plan(bp({ founderShifts: { guide: 9 } })))).toContainEqual(
      expect.objectContaining({ code: 'too_many_hours' }),
    )
  })

  it('sums the guests for the post-mortem: served and paid net of commission, per segment', () => {
    let s = shipped(game('pm'), ['basic_ordering', 'allergy_filter'])
    for (let i = 0; i < 6; i++)
      s = endWeek(s, plan(bp({ platform: true, shifts: { guide: 9 } }))).state
    const g = guestsEconomics(s)!
    const served = s.bookings!.bookings.filter((b) => b.status === 'served')
    expect(g.bySegment.reduce((t, x) => t + x.served, 0)).toBe(
      served.reduce((t, b) => t + b.units, 0),
    )
    const gross = served.reduce((t, b) => t + b.units * b.priceCents, 0)
    expect(g.bySegment.reduce((t, x) => t + x.paidCents, 0) + g.commissionCents).toBe(gross)
    expect(g.platformShare).toBeGreaterThan(0)
    expect(g.bookingCostsCents).toBe(s.ledger.reduce((t, l) => t + l.bookingCostsCents, 0))
    expect(guestsEconomics(createGame(loadScenario('kantino'), 'x'))).toBeNull()
  })

  it('sells a product only once the product it requires has shipped (step 6)', () => {
    const base = tourismScenario()
    const products = {
      ...base.bookings!.products,
      basic_ordering: { ...base.bookings!.products['basic_ordering']!, requires: 'allergy_filter' },
    }
    const scenario = { ...base, bookings: { ...base.bookings!, products } }
    const without = endWeek(
      shipped(createGame(scenario, 'req'), ['basic_ordering']),
      plan(bp({ platform: true })),
    ).state
    expect(without.bookings!.bookings.filter((b) => b.productId === 'basic_ordering')).toEqual([])
    const both = endWeek(
      shipped(createGame(scenario, 'req'), ['basic_ordering', 'allergy_filter']),
      plan(bp({ platform: true })),
    ).state
    expect(both.bookings!.bookings.some((b) => b.productId === 'basic_ordering')).toBe(true)
  })

  it('adds a share of the price to the cost of each unit served (food cost, step 6)', () => {
    const base = tourismScenario()
    const share = (unitCostShare?: number): GameState => {
      const p = base.bookings!.products
      const products = {
        ...p,
        basic_ordering: { ...p['basic_ordering']!, unitCostShare },
      }
      let s = shipped(createGame({ ...base, bookings: { ...base.bookings!, products } }, 'food'), [
        'basic_ordering',
        'allergy_filter',
      ])
      for (let i = 0; i < 4; i++) s = endWeek(s, plan(bp({ shifts: { guide: 9 } }))).state
      return s
    }
    const costs = (s: GameState) => s.ledger.reduce((t, l) => t + l.bookingCostsCents, 0)
    const plain = share()
    const food = share(0.3)
    const gross = food
      .bookings!.bookings.filter((b) => b.status === 'served' && b.productId === 'basic_ordering')
      .reduce((t, b) => t + Math.round(b.units * b.priceCents * 0.3), 0)
    expect(gross).toBeGreaterThan(0)
    expect(costs(food) - costs(plain)).toBe(gross)
  })

  it('counts products that share a capacity against one pool (step 7)', () => {
    const base = tourismScenario()
    const p = base.bookings!.products
    const products = {
      ...p,
      basic_ordering: { ...p['basic_ordering']!, capacity: 6 },
      allergy_filter: { ...p['allergy_filter']!, capacityOf: 'basic_ordering' },
    }
    let s = shipped(createGame({ ...base, bookings: { ...base.bookings!, products } }, 'pool'), [
      'basic_ordering',
      'allergy_filter',
    ])
    for (let i = 0; i < 3; i++) s = endWeek(s, plan(bp({ platform: true }))).state
    const byWeek = new Map<number, number>()
    for (const b of s.bookings!.bookings) {
      if (b.status === 'booked') byWeek.set(b.week, (byWeek.get(b.week) ?? 0) + b.units)
    }
    expect(byWeek.size).toBeGreaterThan(0)
    for (const units of byWeek.values()) expect(units).toBeLessThanOrEqual(6)
    const cal = getView(s).bookings!.calendar.find((c) => c.productId === 'allergy_filter')!
    expect(cal.cells[0]!.capacity).toBe(6)
    // A sharing product's guests are served from the pool's capacity, not its own (0 here).
    let only = shipped(
      createGame({ ...base, bookings: { ...base.bookings!, products } }, 'pool-serve'),
      ['allergy_filter'],
    )
    for (let i = 0; i < 4; i++) only = endWeek(only, plan(bp({ shifts: { guide: 9 } }))).state
    expect(only.bookings!.bookings.some((b) => b.status === 'served')).toBe(true)
  })

  it('takes a deposit when a booking is made and the rest at the stay (step 7)', () => {
    const base = tourismScenario()
    const segments = {
      ...base.bookings!.segments,
      coworking: { ...base.bookings!.segments['coworking']!, depositShare: 0.3 },
    }
    let s = shipped(createGame({ ...base, bookings: { ...base.bookings!, segments } }, 'deposit'), [
      'basic_ordering',
    ])
    s = endWeek(s, plan(bp({ platform: true }))).state
    const booked = s.bookings!.bookings.filter((b) => b.segmentId === 'coworking')
    expect(booked.length).toBeGreaterThan(0)
    for (const b of booked) {
      expect(b.depositCents).toBe(Math.round(b.units * b.priceCents * 0.3))
    }
  })

  it('lets a segment use only its share of a product off season (step 7)', () => {
    const base = tourismScenario()
    const segments = {
      ...base.bookings!.segments,
      small_offices: {
        ...base.bookings!.segments['small_offices']!,
        base: { min: 400, max: 400 },
        capacityShare: { peak: 1, off: 0.2 },
      },
    }
    // The fixture's peak months are June to August; week 1 is in March.
    let s = shipped(createGame({ ...base, bookings: { ...base.bookings!, segments } }, 'share'), [
      'basic_ordering',
    ])
    for (let i = 0; i < 3; i++) s = endWeek(s, plan(bp({ platform: true }))).state
    const byWeek = new Map<number, number>()
    for (const b of s.bookings!.bookings) {
      if (b.segmentId === 'small_offices') byWeek.set(b.week, (byWeek.get(b.week) ?? 0) + b.units)
    }
    expect(byWeek.size).toBeGreaterThan(0)
    for (const units of byWeek.values()) expect(units).toBeLessThanOrEqual(6)
  })

  it('is deterministic', () => {
    const run = () => {
      let s = shipped(game('same'), ['basic_ordering', 'allergy_filter'])
      for (let i = 0; i < 10; i++) {
        s = endWeek(s, plan(bp({ platform: true, shifts: { guide: 6 } }))).state
      }
      return s
    }
    expect(run()).toEqual(run())
  })
})
