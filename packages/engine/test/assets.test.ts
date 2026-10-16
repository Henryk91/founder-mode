import { describe, expect, it } from 'vitest'
import type { AssetConfig, BookingsConfig } from '@founder-mode/content'
import { createGame, endWeek, getView, replay, toSave } from '../src/index'
import { guestsEconomics } from '../src/postmortem'
import { chooseAsset, repairAsset } from '../src/systems/assets'
import type { BookingsPlan, GameState, WeekPlan } from '../src/types'
import { abroadScenario, conditions, STATES } from './abroad'
import { plan } from './helpers'

// Plan 4 (docs/abroad-mechanics.md section 4): an asset owned, leased or shared. The fixture's
// whole-week product `multi_site` runs on a boat; buying it is the product `invoice_export`.

const calm = Array.from({ length: 12 }, () => ({
  morning: STATES.map((x) => (x === 'calm' ? 1 : 0)),
  afternoon: STATES.map((x) => (x === 'calm' ? 1 : 0)),
}))

function boat(over: Partial<AssetConfig> = {}): AssetConfig {
  return {
    name: 'The boat',
    products: ['multi_site'],
    buy: {
      product: 'invoice_export',
      upkeepMonthlyCents: 40_000,
      crewWeekCents: 50_000,
      haulOut: { month: 1, weeks: 3, cents: 250_000 },
      breakdown: { weekly: 0, perYear: 0, weeks: { min: 2, max: 2 }, repairCents: 100_000 },
      ageYears: 10,
      valueLossPerYear: 0.1,
    },
    lease: {
      seasonCents: 2_400_000,
      upfrontShare: 0.25,
      months: [4, 5, 6, 7, 8, 9],
      minMonths: 6,
      crewWeekCents: 30_000,
    },
    share: {
      capacity: 0.5,
      unitCents: 3_000,
      revenueShare: 0.1,
      takeBack: { chance: 1, share: 0.5, months: [7, 8] },
    },
    ...over,
  }
}

function scenario(asset = boat(), over: Partial<BookingsConfig> = {}) {
  const s = abroadScenario({ conditions: conditions({ monthly: calm }), ...over })
  const b = s.bookings!
  return {
    ...s,
    start: { ...s.start, cashCents: 100_000_000 },
    bookings: {
      ...b,
      products: {
        ...b.products,
        invoice_export: { ...b.products['invoice_export']!, oneOffCents: 7_000_000 },
      },
      assets: { boat: asset },
    },
  }
}

const shipped = (s: GameState, ids: string[]): GameState => ({
  ...s,
  product: {
    ...s.product,
    features: s.product.features.map((f) =>
      ids.includes(f.id) ? { ...f, progressHours: 999, shippedWeek: 0 } : f,
    ),
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

const run = (s: GameState, weeks: number) => {
  for (let i = 0; i < weeks && s.status === 'running'; i++) s = endWeek(s, plan(bp())).state
  return s
}

const served = (s: GameState) =>
  s.bookings!.bookings.filter((b) => b.productId === 'multi_site' && b.status === 'served').length

describe('assets', () => {
  it('sell nothing on an asset the company does not have', () => {
    const s = run(shipped(createGame(scenario(), 'none'), ['multi_site']), 12)
    expect(s.bookings!.bookings.some((b) => b.productId === 'multi_site')).toBe(false)
    expect(getView(s).bookings!.assets[0]!.option).toBe('none')
  })

  it('lease: full capacity in the lease months, the fee up front and monthly, early end pays the rest', () => {
    let s = shipped(createGame(scenario(), 'lease'), ['multi_site'])
    const leased = chooseAsset(s, 'boat', 'lease')
    expect(leased.costCents).toBe(600_000)
    s = run(leased.state, 20)
    expect(served(s)).toBeGreaterThan(0)
    const a = s.bookings!.assets!['boat']!
    expect(a.costCents).toBeGreaterThan(600_000)
    // Week 1 is March (fixture week 10 of the year): March is not a lease month, so nothing then.
    expect(s.bookings!.bookings.filter((b) => b.productId === 'multi_site' && b.week <= 3)).toEqual(
      [],
    )
    const ended = chooseAsset(s, 'boat', 'none')
    // Weeks 1 to 24 are the minimum: four weeks are left, a month of the fee.
    expect(ended.costCents).toBe(Math.round((2_400_000 * 0.75) / 6))
  })

  it('share: half the places, fewer when the owner takes some back, a fee per place and a share', () => {
    let s = shipped(createGame(scenario(), 'share'), ['multi_site'])
    s = chooseAsset(s, 'boat', 'share').state
    s = run(s, 30)
    const view = getView(s).bookings!
    expect(view.assets[0]!.option).toBe('share')
    expect(served(s)).toBeGreaterThan(0)
    expect(s.bookings!.assets!['boat']!.costCents).toBeGreaterThan(0)
    const cal = view.calendar.find((c) => c.productId === 'multi_site')!
    for (const cell of cal.cells) expect(cell.capacity).toBeLessThanOrEqual(8)
  })

  it('buy: owned once the purchase ships, with upkeep, breakdowns, repairs and a haul-out', () => {
    const risky = scenario(
      boat({
        buy: {
          ...boat().buy!,
          breakdown: { weekly: 0.5, perYear: 0, weeks: { min: 2, max: 2 }, repairCents: 100_000 },
        },
      }),
    )
    let s = shipped(createGame(risky, 'buy'), ['multi_site'])
    s = endWeek(s, plan({ build: { invoice_export: 25 }, ...bp() })).state
    expect(s.bookings!.assets!['boat']!.option).toBe('buy')
    s = run(s, 10)
    const a = s.bookings!.assets!['boat']!
    expect(a.breakdowns).toBeGreaterThan(0)
    // A repair opens it again at once.
    const broken = {
      ...s,
      bookings: { ...s.bookings!, assets: { boat: { ...a, brokenUntil: s.week + 3 } } },
    }
    const fixed = repairAsset(broken, 'boat')
    expect(fixed.costCents).toBe(100_000)
    expect(fixed.state.bookings!.assets!['boat']!.brokenUntil).toBe(s.week)
    // Through January: three weeks hauled out, paid once.
    const safe = scenario()
    let t = shipped(createGame(safe, 'haul'), ['multi_site', 'invoice_export'])
    t = {
      ...t,
      bookings: {
        ...t.bookings!,
        assets: { boat: { ...t.bookings!.assets!['boat']!, option: 'buy', boughtWeek: 1 } },
      },
    }
    t = run(t, 52)
    expect(getView(t).bookings!.assets[0]!.valueCents).toBe(6_300_000)
    const g = guestsEconomics(t)!
    expect(g.assets![0]!.option).toBe('buy')
    expect(g.assets![0]!.priceCents).toBe(7_000_000)
  })

  it('keeps peak months for the owner unless enough shoulder weeks were sold by the deadline', () => {
    const managed = boat({
      buy: undefined,
      lease: undefined,
      share: {
        capacity: 1,
        unitCents: 0,
        revenueShare: 0.75,
        peakRule: { months: [7, 8], shoulderMonths: [5, 6, 9], needWeeks: 60, byWeek: 13 },
      },
    })
    let s = shipped(createGame(scenario(managed), 'peak'), ['multi_site'])
    s = chooseAsset(s, 'boat', 'share').state
    s = run(s, 30)
    const inPeak = s.bookings!.bookings.filter(
      (b) => b.productId === 'multi_site' && b.week >= 18 && b.week <= 26,
    )
    expect(inPeak).toEqual([])
    expect(getView(s).bookings!.assets[0]!.peakReleased).toBe(false)
  })

  it('replays a saved game with an asset exactly', () => {
    const sc = scenario()
    // Built through plans only, so the save holds everything.
    let s = createGame(sc, 'replay')
    const builds = [{ invoice_export: 25 }, { multi_site: 30 }, { multi_site: 15 }]
    for (let i = 0; i < 20; i++) {
      s = endWeek(s, plan({ build: builds[i] ?? {}, ...bp() })).state
    }
    expect(s.bookings!.assets!['boat']!.option).toBe('buy')
    expect(replay(sc, toSave(s))).toEqual(s)
  })
})
