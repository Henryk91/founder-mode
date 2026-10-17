import { describe, expect, it } from 'vitest'
import type { BookingsConfig } from '@founder-mode/content'
import {
  createGame,
  endWeek,
  getView,
  replay,
  toSave,
  validatePlan,
} from '../src/index'
import { canFinance } from '../src/systems/loan'
import { guestsEconomics } from '../src/postmortem'
import type { BookingsPlan, GameState, WeekPlan } from '../src/types'
import { abroadScenario, conditions, STATES } from './abroad'
import { plan } from './helpers'

// Plan 4 (docs/scenario-gulet.md section 6): holding weeks, the minimum to sail, friction, the
// refit and the local company. The fixture's whole-week `multi_site` sells cabins (two places
// each); `chat_integration` sells the whole boat from its places.

const calm = Array.from({ length: 12 }, () => ({
  morning: STATES.map((x) => (x === 'calm' ? 1 : 0)),
  afternoon: STATES.map((x) => (x === 'calm' ? 1 : 0)),
}))

function scenario(over: Partial<BookingsConfig> = {}) {
  const s = abroadScenario({ conditions: conditions({ monthly: calm }) })
  const b = s.bookings!
  const bookings: BookingsConfig = {
    ...b,
    segments: {
      ...b.segments,
      small_offices: {
        ...b.segments['small_offices']!,
        size: { min: 1, max: 2 },
        leadWeeks: { min: 2, max: 6 },
      },
      medical: {
        ...b.segments['medical']!,
        size: { min: 16, max: 16 },
        invoiced: false,
        leadWeeks: { min: 2, max: 6 },
      },
    },
    products: {
      ...b.products,
      multi_site: { ...b.products['multi_site']!, capacity: 16, serves: ['small_offices'] },
      chat_integration: {
        capacity: 0,
        capacityOf: 'multi_site',
        serves: ['medical'],
        wholeWeek: true,
        oneOffCents: 0,
        monthlyCents: 0,
        unitCostCents: 0,
        months: [],
        weatherClosed: false,
      },
      shift_schedule: { ...b.products['shift_schedule']!, waitWeeks: 2 },
      invoice_export: {
        ...b.products['invoice_export']!,
        oneOffCents: 5_000_000,
        requires: 'shift_schedule',
      },
      supplier_portal: {
        ...b.products['supplier_portal']!,
        oneOffCents: 100_000,
        requires: 'invoice_export',
        closesAsset: { asset: 'boat', weeks: 4 },
        wtpFactor: { medical: 1.5 },
      },
    },
    roles: {
      guide: {
        ...b.roles['guide']!,
        units: { ...b.roles['guide']!.units, multi_site: 16, chat_integration: 16 },
      },
    },
    assets: {
      boat: {
        name: 'The boat',
        products: ['multi_site', 'chat_integration'],
        buy: {
          product: 'invoice_export',
          upkeepMonthlyCents: 0,
          crewWeekCents: 0,
          breakdown: { weekly: 0, perYear: 0, weeks: { min: 1, max: 1 }, repairCents: 0 },
          ageYears: 0,
          valueLossPerYear: 0,
        },
        share: { capacity: 1, unitCents: 0, revenueShare: 0.75 },
      },
    },
    hold: { products: ['multi_site'] },
    minSail: {
      product: 'multi_site',
      perUnit: 2,
      options: [0, 4, 6],
      weeksBefore: 3,
      moveCents: 15_000,
      policyWeeks: 4,
    },
    friction: {
      product: 'multi_site',
      chance: 1,
      penalty: 1,
      themed: 'member_billing',
      themedFactor: 0,
      themedConversion: 0.9,
    },
    ...over,
  }
  return { ...s, start: { ...s.start, cashCents: 100_000_000 }, bookings }
}

const ship = (s: GameState, ids: string[]): GameState => ({
  ...s,
  product: {
    ...s.product,
    features: s.product.features.map((f) =>
      ids.includes(f.id) ? { ...f, progressHours: 999, shippedWeek: 0 } : f,
    ),
  },
})

const shared = (s: GameState): GameState => ({
  ...s,
  bookings: {
    ...s.bookings!,
    assets: { boat: { ...s.bookings!.assets!['boat']!, option: 'share' } },
  },
})

const bp = (over: Partial<BookingsPlan> = {}): Partial<WeekPlan> => ({
  bookings: {
    shifts: { guide: 9 },
    founderShifts: {},
    prices: {},
    policy: null,
    platform: true,
    partnerships: [],
    outreach: {},
    ...over,
  },
})

const start = (seed: string, over: Partial<BookingsConfig> = {}) =>
  shared(ship(createGame(scenario(over), seed), ['multi_site', 'chat_integration']))

describe('cruise weeks', () => {
  it('sells no cabins in a held week, but the whole boat can still be booked', () => {
    let s = start('hold')
    // Cabin guests flex to the season's next weeks, so hold them all.
    const weeks = Array.from({ length: 104 }, (_, i) => i + 1)
    s = endWeek(s, plan(bp({ hold: weeks.map((week) => ({ week, on: true })) }))).state
    for (let i = 0; i < 12; i++) s = endWeek(s, plan(bp())).state
    const cabins = s.bookings!.bookings.filter((b) => b.productId === 'multi_site')
    expect(cabins).toEqual([])
    expect(s.bookings!.bookings.some((b) => b.productId === 'chat_integration')).toBe(true)
    const view = getView(s).bookings!.cruise!
    expect(view.weeks.find((w) => w.week === 15)!.held).toBe(true)
    // Releasing a week lets cabins sell in it again; a week in the past cannot be held.
    expect(validatePlan(s, plan(bp({ hold: [{ week: 1, on: true }] })))).toContainEqual({
      code: 'invalid_bookings',
    })
  })

  it('cancels a week below the minimum three weeks out, refunding or moving its guests', () => {
    const refunded = (move: boolean) => {
      let s = start('min')
      s = endWeek(s, plan(bp({ minSail: { min: 6, move } }))).state
      for (let i = 0; i < 12; i++) s = endWeek(s, plan(bp())).state
      return s
    }
    const r = refunded(false)
    const m = refunded(true)
    expect(r.bookings!.held!.length).toBeGreaterThan(0)
    expect(
      r.bookings!.bookings.some(
        (b) => b.productId === 'multi_site' && b.status === 'company_cancelled',
      ),
    ).toBe(true)
    expect(m.bookings!.reviews).toBeLessThan(r.bookings!.reviews)
    // Tuning 1: the post-mortem gets each cancelled week, what it gave up and what it saved.
    const weeks = guestsEconomics(m)!.cancelledWeeks!
    expect(weeks.length).toBeGreaterThan(0)
    expect(weeks[0]!.lostCents).toBeGreaterThan(0)
    expect(weeks[0]!.costCents).toBeGreaterThan(0)
    // A managed boat: sailing would have cost the owner's three quarters of the takings.
    expect(weeks[0]!.savedCents).toBeGreaterThanOrEqual(Math.round(weeks[0]!.lostCents * 0.75))
    // The minimum stays for its weeks.
    expect(validatePlan(r, plan(bp({ minSail: { min: 0, move: false } })))).toEqual([])
    const fresh = endWeek(start('lock'), plan(bp({ minSail: { min: 4, move: false } }))).state
    expect(validatePlan(fresh, plan(bp({ minSail: { min: 6, move: false } })))).toContainEqual({
      code: 'invalid_bookings',
    })
  })

  it('lets strangers on one boat fall out, unless the weeks are themed', () => {
    const rating = (themed: boolean) => {
      let s = start('friction')
      if (themed) s = ship(s, ['member_billing'])
      for (let i = 0; i < 20; i++) s = endWeek(s, plan(bp())).state
      return s.bookings!.rating ?? 5
    }
    expect(rating(true)).toBeGreaterThan(rating(false))
  })

  it('needs the local company before the purchase, and the refit closes the boat', () => {
    let s = createGame(scenario(), 'company')
    expect(validatePlan(s, plan({ build: { invoice_export: 25 } }))).toContainEqual({
      code: 'invalid_bookings',
    })
    s = { ...s, loan: s.loan }
    expect(canFinance(s, 'invoice_export')).toBe(false)
    s = ship(s, ['shift_schedule'])
    expect(validatePlan(s, plan({ build: { invoice_export: 25 } }))).toEqual([])
    s = endWeek(s, plan({ build: { invoice_export: 25 } })).state
    expect(s.bookings!.assets!['boat']!.option).toBe('buy')
    s = endWeek(s, plan({ build: { supplier_portal: 30 } })).state
    s = endWeek(s, plan({ build: { supplier_portal: 30 } })).state
    // Shipped last week (week 3): closed for four weeks, through week 6.
    expect(s.bookings!.assets!['boat']!.brokenUntil).toBe(6)
    expect(getView(s).bookings!.cruise!.weeks[0]!.closed).toBe(true)
  })

  it('replays a saved cruise game exactly', () => {
    const sc = scenario()
    let s = createGame(sc, 'cruise-replay')
    const builds = [{ multi_site: 45 }, { chat_integration: 20 }]
    for (let i = 0; i < 16; i++) {
      s = endWeek(
        s,
        plan({ build: builds[i] ?? {}, ...bp(i === 2 ? { minSail: { min: 4, move: true } } : {}) }),
      ).state
    }
    const again = replay(sc, toSave(s))
    const diff = (a: unknown, b: unknown, path: string): string[] => {
      if (JSON.stringify(a) === JSON.stringify(b)) return []
      if (a && b && typeof a === 'object' && typeof b === 'object') {
        return Object.keys({ ...(a as object), ...(b as object) }).flatMap((k) =>
          diff(
            (a as Record<string, unknown>)[k],
            (b as Record<string, unknown>)[k],
            `${path}.${k}`,
          ),
        )
      }
      return [`${path}: ${JSON.stringify(a)?.slice(0, 80)} vs ${JSON.stringify(b)?.slice(0, 80)}`]
    }
    expect(diff(again, s, '').slice(0, 5)).toEqual([])
  })
})

describe('requests ahead (tuning 1)', () => {
  // Cabin guests who travel only in July and book 8 to 20 weeks ahead. The fixture's calendar
  // starts in week 10 of the year, early March.
  const july = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]
  const run = (ahead: boolean) => {
    const base = scenario()
    const segs = base.bookings.segments
    let s = start('ahead', {
      requestsAhead: ahead,
      segments: {
        ...segs,
        small_offices: { ...segs['small_offices']!, season: july, leadWeeks: { min: 8, max: 20 } },
      },
    })
    for (let i = 0; i < 8; i++) s = endWeek(s, plan(bp())).state
    return s.bookings!.bookings.filter((b) => b.productId === 'multi_site')
  }

  it('lets guests ask in spring for the summer weeks they want', () => {
    // By the week they are made, March and April ask for nothing; by the weeks they want, they
    // ask for July.
    expect(run(false)).toEqual([])
    const ahead = run(true)
    expect(ahead.length).toBeGreaterThan(0)
    const months = ahead.map((b) => Math.floor(((((10 - 1 + b.week - 1) % 52) * 12) / 52) + 1))
    expect(months.every((m) => m >= 6 && m <= 8)).toBe(true)
  })
})
