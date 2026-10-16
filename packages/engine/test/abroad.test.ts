import { describe, expect, it } from 'vitest'
import { createGame, endWeek, getView, replay, toSave, validatePlan } from '../src/index'
import { guestsEconomics } from '../src/postmortem'
import { Rng, seedRng } from '../src/rng'
import {
  applyTender,
  drawConditionsWeek,
  expectedShare,
  forecastConditions,
  spotDays,
  suitableSlots,
} from '../src/systems/abroad'
import type { BookingsPlan, ConditionsWeek, GameState, WeekPlan } from '../src/types'
import { abroadScenario, conditions, STATES } from './abroad'
import { plan } from './helpers'

// Plan 4 (docs/abroad-mechanics.md): day conditions, courses, trips, licences, the tender and
// local cost steps, on a fixture scenario.

const game = (seed = 'abroad', over = {}) => createGame(abroadScenario(over), seed)

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

const bp = (over: Partial<BookingsPlan> = {}): Partial<WeekPlan> => ({
  bookings: {
    shifts: { guide: 9 },
    founderShifts: {},
    prices: {},
    policy: null,
    platform: null,
    partnerships: [],
    outreach: {},
    ...over,
  },
})

const run = (s: GameState, weeks: number, over: Partial<BookingsPlan> = {}) => {
  for (let i = 0; i < weeks && s.status === 'running'; i++) s = endWeek(s, plan(bp(over))).state
  return s
}

/** Every slot of every month in one state. */
const always = (state: (typeof STATES)[number]) => {
  const probs = STATES.map((x) => (x === state ? 1 : 0))
  return Array.from({ length: 12 }, () => ({ morning: probs, afternoon: probs }))
}

describe('day conditions', () => {
  it('draws seven days per slot, keeps spells with persistence, and forecasts one state off', () => {
    const c = conditions()
    const rng = new Rng(seedRng('draw'))
    const week = drawConditionsWeek(c, 6, null, rng)
    expect(Object.keys(week)).toEqual(['morning', 'afternoon'])
    for (const days of Object.values(week)) {
      expect(days).toHaveLength(7)
      for (const d of days) expect(STATES).toContain(d)
    }
    // Spells: full persistence repeats last week's last day all week.
    const spell = drawConditionsWeek({ ...c, persistence: 1 }, 6, week, rng)
    expect(new Set(spell.morning)).toEqual(new Set([week.morning!.at(-1)]))
    // A perfect forecast is the truth; a useless one is always exactly one state away.
    expect(forecastConditions({ ...c, forecastAccuracy: 1 }, week, rng)).toEqual(week)
    const wrong = forecastConditions({ ...c, forecastAccuracy: 0 }, week, rng)
    const at = (s: string) => STATES.indexOf(s as (typeof STATES)[number])
    for (const slot of ['morning', 'afternoon']) {
      wrong[slot]!.forEach((d, i) => expect(Math.abs(at(d) - at(week[slot]![i]!))).toBe(1))
    }
  })

  it('moves the trip spot one state up, capped at the top', () => {
    const c = conditions()
    const week: ConditionsWeek = {
      morning: Array(7).fill('calm'),
      afternoon: ['calm', 'light', 'good', 'strong', 'storm', 'calm', 'calm'],
    }
    expect(spotDays(c, week)).toEqual([
      'light',
      'good',
      'strong',
      'storm',
      'storm',
      'light',
      'light',
    ])
  })

  it('counts the slots that suit a product, and its usual share in a month', () => {
    const cfg = abroadScenario().bookings!
    const week: ConditionsWeek = {
      morning: ['calm', 'calm', 'light', 'good', 'storm', 'calm', 'light'],
      afternoon: Array(7).fill('good'),
    }
    expect(suitableSlots(cfg, 'basic_ordering', week)).toEqual({ suitable: 5, total: 7 })
    expect(suitableSlots(cfg, 'chat_integration', week)).toEqual({ suitable: 10, total: 14 })
    expect(suitableSlots(cfg, 'allergy_filter', week)).toEqual({ suitable: 7, total: 7 })
    expect(expectedShare(cfg, 'basic_ordering', 6)).toBeCloseTo(0.8)
    // The spot: afternoon light or good at home is good or strong there.
    expect(expectedShare(cfg, 'allergy_filter', 6)).toBeCloseTo(0.7)
  })

  it('shows the forecast and labels per product, never the truth or the chances', () => {
    const view = getView(game()).bookings!
    const a = view.abroad!
    expect(a.slots.map((s) => s.id)).toEqual(['morning', 'afternoon'])
    for (const slot of ['morning', 'afternoon']) {
      expect(Object.values(a.forecastCounts[slot]!).reduce((t, n) => t + n, 0)).toBe(7)
    }
    expect(a.runsOn.find((r) => r.productId === 'basic_ordering')!.total).toBe(7)
    expect(a.lastWeek).toBeNull()
    const json = JSON.stringify(getView(game()))
    expect(json).not.toContain('nextConditions')
    expect(json).not.toContain('forecastAccuracy')
    expect(json).not.toContain('persistence')
    expect(json).not.toContain('returns')
  })

  it('sells a product only on suitable slots: guests beyond them are refunded', () => {
    const storms = abroadScenario({ conditions: conditions({ monthly: always('storm') }) })
    let s = shipped(createGame(storms, 'storm'), ['basic_ordering'])
    s = run(s, 8, { platform: true })
    const mine = s.bookings!.bookings.filter((b) => b.productId === 'basic_ordering')
    expect(mine.some((b) => b.status === 'served')).toBe(false)
    expect(s.bookings!.abroad!.lost['basic_ordering'] ?? 0).toBe(0)
    // Nothing is sold for weeks that never suit the product.
    expect(mine).toHaveLength(0)

    const calm = abroadScenario({ conditions: conditions({ monthly: always('calm') }) })
    let c = shipped(createGame(calm, 'calm'), ['basic_ordering'])
    c = run(c, 8, { platform: true })
    expect(c.bookings!.bookings.some((b) => b.status === 'served')).toBe(true)
  })

  it('cancels, moves to the alternative, or (strict) moves to next week when the week turns', () => {
    // Bookings made in calm weeks, then a week of storms nobody expected.
    const scenario = abroadScenario({ conditions: conditions({ monthly: always('calm') }) })
    // A fresh run each time: the bookings step changes this week's bookings in place.
    const start = () =>
      run(shipped(createGame(scenario, 'turn'), ['basic_ordering']), 5, { platform: true })
    const storm: ConditionsWeek = {
      morning: Array(7).fill('storm'),
      afternoon: Array(7).fill('storm'),
    }
    const until = (s: GameState, over: Partial<BookingsPlan> = {}) => {
      const turned: GameState = {
        ...s,
        hidden: { ...s.hidden, bookings: { ...s.hidden.bookings!, nextConditions: storm } },
      }
      return endWeek(turned, plan(bp({ platform: true, ...over }))).state
    }
    const flexible = until(start())
    expect(flexible.bookings!.abroad!.lost['basic_ordering']).toBeGreaterThan(0)
    const alt = until(shipped(start(), ['supplier_portal']))
    expect(alt.bookings!.bookings.some((b) => b.productId === 'supplier_portal')).toBe(true)
    expect(alt.bookings!.abroad!.moved).toBeGreaterThan(0)
    // Under a strict policy, with room next week, the guests move instead of a refund.
    const roomy = abroadScenario({ conditions: conditions({ monthly: always('calm') }) })
    const bo = roomy.bookings!.products['basic_ordering']!
    roomy.bookings!.products['basic_ordering'] = { ...bo, capacity: 400 }
    const before = run(shipped(createGame(roomy, 'turn'), ['basic_ordering']), 5, {
      platform: true,
      policy: 'strict',
    })
    const strict = until(before)
    expect(strict.bookings!.abroad!.moved).toBeGreaterThan(0)
    expect(strict.bookings!.abroad!.lost['basic_ordering'] ?? 0).toBe(0)
  })

  it("lowers a whole-week product's reviews for bad slots, less with the shelter", () => {
    const rough = abroadScenario({ conditions: conditions({ monthly: always('strong') }) })
    const rated = (ids: string[]) => {
      const s = run(shipped(createGame(rough, 'cruise'), ['multi_site', ...ids]), 10, {
        platform: true,
      })
      expect(
        s.bookings!.bookings.some((b) => b.productId === 'multi_site' && b.status === 'served'),
      ).toBe(true)
      return s.bookings!.rating!
    }
    expect(rated(['member_billing'])).toBeGreaterThan(rated([]))
  })
})

describe('courses and progression', () => {
  const calm = () => abroadScenario({ conditions: conditions({ monthly: always('light') }) })

  it('turns served course places into graduates, some booking their next step next week', () => {
    let s = shipped(createGame(calm(), 'ladder'), ['basic_ordering', 'chat_integration'])
    s = run(s, 12, { platform: true })
    const ladder = s.bookings!.abroad!.ladder[0]!
    expect(ladder.students).toBeGreaterThan(0)
    expect(ladder.sameStay).toBeGreaterThan(0)
    // The product for graduates sells only to them: every booking of it came a week after a course.
    const next = s.bookings!.bookings.filter((b) => b.productId === 'chat_integration')
    expect(next.length).toBe(ladder.sameStay > 0 ? next.length : 0)
    for (const b of next) expect(b.week).toBe(b.bookedWeek + 1)
    expect(getView(s).bookings!.abroad!.ladderThisYear.students).toBe(ladder.students)
  })

  it('sells a level product to a segment whose guests hold the level', () => {
    const base = calm()
    const b = base.bookings!
    const certified = {
      ...base,
      bookings: {
        ...b,
        segments: { ...b.segments, coworking: { ...b.segments['coworking']!, levels: ['basic'] } },
      },
    }
    let s = shipped(createGame(certified, 'certified'), ['chat_integration'])
    s = run(s, 4, { platform: true })
    expect(s.bookings!.bookings.some((x) => x.productId === 'chat_integration')).toBe(true)
  })

  it("brings graduates back a year later, the platform's guests through the platform", () => {
    let s = shipped(createGame(calm(), 'return'), ['basic_ordering', 'chat_integration'])
    s = run(s, 70, { platform: false })
    const years = s.bookings!.abroad!.ladder
    expect(years[1]?.returnedDirect ?? 0).toBeGreaterThan(0)
    expect(years[1]?.returnedPlatform ?? 0).toBe(0)
    const returned = s.bookings!.bookings.filter(
      (x) => x.productId === 'chat_integration' && x.week - x.bookedWeek > 1,
    )
    expect(returned.length).toBeGreaterThan(0)
  })
})

describe('day trips', () => {
  it('sell only while the policy runs trips, and the policy stays for its weeks', () => {
    const s0 = shipped(game('trip'), ['allergy_filter'])
    const never = endWeek(s0, plan(bp({ trips: { min: null } }))).state
    expect(never.bookings!.abroad!.trips!.min).toBeNull()
    expect(validatePlan(never, plan(bp({ trips: { min: 1 } })))).toContainEqual({
      code: 'invalid_bookings',
    })
    expect(validatePlan(never, plan(bp({ trips: { min: 4 } })))).toContainEqual({
      code: 'invalid_bookings',
    })
    const later = run(never, 6)
    expect(later.bookings!.bookings.some((b) => b.productId === 'allergy_filter')).toBe(false)
  })

  it('runs trips on forecast days, wastes some on a wrong forecast, and costs fuel', () => {
    let s = shipped(game('trips'), ['allergy_filter'])
    s = run(s, 20, { platform: true })
    const t = s.bookings!.abroad!.trips!
    expect(t.run).toBeGreaterThan(0)
    expect(t.costCents).toBe(t.run * 4_000)
    expect(t.guests).toBeGreaterThan(0)
    let wasted = 0
    for (let seed = 0; seed < 6; seed++) {
      const x = run(shipped(game(`w${seed}`), ['allergy_filter']), 20, { platform: true })
      wasted += x.bookings!.abroad!.trips!.wasted
    }
    expect(wasted).toBeGreaterThan(0)
  })

  it('needs a staff shift per trip day', () => {
    const s = run(shipped(game('noshift'), ['allergy_filter']), 10, { platform: true, shifts: {} })
    expect(s.bookings!.abroad!.trips!.run).toBe(0)
  })
})

describe('licences', () => {
  it('ships a licence product only after its wait', () => {
    let s = game('licence')
    s = endWeek(s, plan({ build: { shift_schedule: 20 } })).state
    expect(s.product.features.find((f) => f.id === 'shift_schedule')!.shippedWeek).toBeNull()
    s = endWeek(s, plan({ build: { shift_schedule: 15 } })).state
    const f = s.product.features.find((x) => x.id === 'shift_schedule')!
    expect(f.readyWeek).toBe(5)
    expect(getView(s).product.features.find((x) => x.id === 'shift_schedule')!.readyWeek).toBe(5)
    s = run(s, 2)
    expect(s.product.features.find((x) => x.id === 'shift_schedule')!.shippedWeek).toBeNull()
    s = run(s, 1)
    expect(s.product.features.find((x) => x.id === 'shift_schedule')!.shippedWeek).toBe(5)
  })
})

describe('the tender and local costs', () => {
  const at = (s: GameState, id: string) =>
    s.company.fixedCosts.find((c) => c.id === id)!.monthlyCents

  it('raises the fee for a higher bid, lowers it at a hotel, and keeps or loses the spot', () => {
    const s = game('tender')
    const rng = new Rng(seedRng('t'))
    const higher = applyTender(s, 'higher', rng).state
    expect(at(higher, 'accountant')).toBe(Math.round(at(s, 'accountant') * 1.4))
    expect(higher.bookings!.abroad!.tender).toEqual({ bid: 'higher', kept: true, week: 1 })
    const hotel = applyTender(s, 'hotel', rng).state
    expect(at(hotel, 'accountant')).toBe(Math.round(at(s, 'accountant') * 0.6))
    // A second answer changes nothing.
    expect(applyTender(higher, 'hotel', rng).state).toBe(higher)
    let kept = 0
    for (let i = 0; i < 400; i++) {
      if (applyTender(s, 'same', rng).state.bookings!.abroad!.tender!.kept) kept++
    }
    // No reviews yet: the lowest chance, a half.
    expect(kept / 400).toBeGreaterThan(0.4)
    expect(kept / 400).toBeLessThan(0.6)
  })

  it('raises local costs from their week', () => {
    const rich = abroadScenario()
    let s = createGame({ ...rich, start: { ...rich.start, cashCents: 100_000_000 } }, 'costs')
    s = run(s, 52, { shifts: {} })
    const before = at(s, 'tools_hosting')
    expect(s.week).toBe(53)
    s = run(s, 1, { shifts: { guide: 1 } })
    expect(at(s, 'tools_hosting')).toBe(Math.round(before * 1.15))
    expect(s.ledger.at(-1)!.bookingCostsCents).toBeGreaterThanOrEqual(Math.round(30_000 * 1.15))
  })
})

describe('determinism', () => {
  it('replays a saved abroad game exactly, and the post-mortem has its lines', () => {
    const scenario = abroadScenario()
    let s = shipped(createGame(scenario, 'replay'), [])
    for (let i = 0; i < 30; i++) {
      const w = s.week
      s = endWeek(
        s,
        plan({
          build: w <= 4 ? { basic_ordering: 10, allergy_filter: 7 } : {},
          ...bp({ platform: w === 6 ? true : null, ...(w === 8 ? { trips: { min: 1 } } : {}) }),
        }),
      ).state
    }
    expect(replay(scenario, toSave(s))).toEqual(s)
    const g = guestsEconomics(s)!
    expect(g.abroad!.months.length).toBeGreaterThan(0)
    expect(g.abroad!.trips).not.toBeNull()
  })
})
