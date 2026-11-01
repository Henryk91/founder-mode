import { loadScenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek, getView, replay, shutDown, toSave, validatePlan } from '../src/index'
import { lnPos, powPos } from '../src/math'
import { buildPostMortem } from '../src/postmortem'
import { priceFor, priceSeasonOf, volumeFactor } from '../src/systems/bookings'
import type { BookingsPlan, GameState, WeekPlan } from '../src/types'
import { plan } from './helpers'
import { tourismScenario } from './tourism'

// Plan 6 (docs/plan6-features.md section 1): requests answer the price.

const elastic = (e = { min: 1, max: 1 }) => {
  const s = tourismScenario({ elasticity: { clamp: { min: 0.5, max: 1.6 } } })
  const b = s.bookings!
  return {
    ...s,
    bookings: {
      ...b,
      segments: Object.fromEntries(
        Object.entries(b.segments).map(([id, seg]) => [id, { ...seg, elasticity: e }]),
      ),
    },
  }
}

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

/** Requests asked over a run at one price for every segment, all year. */
function requestsAt(price: number, seed: string, weeks = 12): number {
  const scenario = elastic()
  let s = shipped(createGame(scenario, seed), ['basic_ordering', 'allergy_filter'])
  const prices = Object.fromEntries(
    scenario.segments.map((x) => [x.id, { peak: price, off: price }]),
  )
  for (let i = 0; i < weeks; i++)
    s = endWeek(
      s,
      plan(bp({ platform: i === 0 ? true : null, prices: i === 0 ? prices : {} })),
    ).state
  return Object.values(s.bookings!.requestLog ?? {}).reduce((t, x) => t + x.requests, 0)
}

describe('the arithmetic', () => {
  it('computes ln and powers from plain arithmetic, close to Math', () => {
    for (const x of [0.3, 0.5, 0.85, 1, 1.2, 2, 7.5]) expect(lnPos(x)).toBeCloseTo(Math.log(x), 10)
    for (const [b, p] of [
      [0.8, -1.2],
      [1.3, -0.4],
      [0.5, -1.5],
      [2, 0.5],
    ] as const)
      expect(powPos(b, p)).toBeCloseTo(b ** p, 10)
  })
})

describe('the volume factor', () => {
  it('is 1 at the willingness to pay, rises below it, falls above it, within the clamp', () => {
    const cfg = elastic().bookings!
    expect(volumeFactor(cfg, 1, 1)).toBeCloseTo(1)
    expect(volumeFactor(cfg, 1, 0.8)).toBeCloseTo(1.25)
    expect(volumeFactor(cfg, 1, 1.25)).toBeCloseTo(0.8)
    expect(volumeFactor(cfg, 1.5, 0.3)).toBe(1.6)
    expect(volumeFactor(cfg, 1.5, 3)).toBe(0.5)
  })

  it('is off without the scenario block or a segment elasticity', () => {
    const cfg = tourismScenario().bookings!
    expect(volumeFactor(cfg, 1, 0.5)).toBe(1)
    expect(volumeFactor(elastic().bookings!, undefined, 0.5)).toBe(1)
    expect(createGame(tourismScenario(), 'off').hidden.bookings!.elasticity).toBeUndefined()
  })

  it('draws elasticity per run within the range, apart from the other draws', () => {
    const a = createGame(elastic({ min: 0.2, max: 0.6 }), 'draw')
    const b = createGame(tourismScenario(), 'draw')
    for (const e of Object.values(a.hidden.bookings!.elasticity!)) {
      expect(e).toBeGreaterThanOrEqual(0.2)
      expect(e).toBeLessThanOrEqual(0.6)
    }
    // Switching elasticity on moves no other draw.
    expect(a.rng).toEqual(b.rng)
    expect(a.hidden.bookings!.base).toEqual(b.hidden.bookings!.base)
  })

  it('brings more requests at a lower price and fewer at a higher one', () => {
    const seeds = ['p1', 'p2', 'p3']
    const low = seeds.reduce((t, x) => t + requestsAt(30_000, x), 0)
    const mid = seeds.reduce((t, x) => t + requestsAt(50_000, x), 0)
    const high = seeds.reduce((t, x) => t + requestsAt(80_000, x), 0)
    expect(low).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(high)
  })

  it('keeps the player view free of elasticity', () => {
    const json = JSON.stringify(getView(createGame(elastic(), 'view')))
    expect(json).not.toContain('elasticity')
    expect(json).not.toContain('requestLog')
  })
})

describe('the shoulder price', () => {
  it('applies in the shoulder months and falls back to the off season price', () => {
    const scenario = loadScenario('leinenlos')
    const cfg = scenario.bookings!
    expect(priceSeasonOf(cfg, 7)).toBe('peak')
    expect(priceSeasonOf(cfg, 5)).toBe('shoulder')
    expect(priceSeasonOf(cfg, 1)).toBe('off')
    const s = createGame(scenario, 'shoulder')
    const p = s.bookings!.prices.cabin_guests!
    expect(p.shoulder).toBeDefined()
    // A week in May: the shoulder price.
    let may = 1
    while (priceSeasonOf(cfg, getMonth(s, may)) !== 'shoulder') may++
    expect(priceFor(s, 'cabin_guests', may)).toBe(p.shoulder)
    const noShoulder = {
      ...s,
      bookings: { ...s.bookings!, prices: { cabin_guests: { peak: 1, off: 2 } } },
    }
    expect(priceFor(noShoulder, 'cabin_guests', may)).toBe(2)
    expect(getView(s).bookings!.shoulderMonths).toEqual([5, 6, 9, 10])
  })

  it('keeps the shoulder price when a plan sets only peak and off, and rejects it without shoulder months', () => {
    const scenario = loadScenario('leinenlos')
    const s = createGame(scenario, 'keep')
    const shoulder = s.bookings!.prices.cabin_guests!.shoulder
    const next = endWeek(
      s,
      plan(bp({ prices: { cabin_guests: { peak: 90_000, off: 70_000 } } })),
    ).state
    expect(next.bookings!.prices.cabin_guests).toEqual({ peak: 90_000, off: 70_000, shoulder })
    const t = createGame(elastic(), 'reject')
    const bad = plan(bp({ prices: { coworking: { peak: 50_000, off: 40_000, shoulder: 45_000 } } }))
    expect(validatePlan(t, bad)).not.toEqual([])
  })
})

describe('determinism and the post-mortem', () => {
  it('replays a saved game with elasticity exactly, and lists each price season', () => {
    const scenario = elastic({ min: 0.6, max: 1.2 })
    let s = createGame(scenario, 'replay')
    for (let i = 0; i < 30 && s.status === 'running'; i++) {
      s = endWeek(
        s,
        plan({
          build: i < 4 ? { basic_ordering: 10, allergy_filter: 7 } : {},
          ...bp({
            platform: i === 0 ? true : null,
            prices: i === 10 ? { coworking: { peak: 55_000, off: 30_000 } } : {},
          }),
        }),
      ).state
    }
    expect(replay(scenario, toSave(s))).toEqual(s)
    const lines = buildPostMortem(s.status === 'running' ? shutDown(s) : s).priceSeasons!
    expect(lines.length).toBeGreaterThan(1)
    expect(lines[0]!.fromWeek).toBe(1)
    expect(lines.at(-1)!.toWeek).toBe(s.week)
    expect(lines.reduce((t, x) => t + x.weeks, 0)).toBe(s.week)
    expect(lines.some((x) => x.requests > 0)).toBe(true)
    // Without elasticity there are no lines.
    const none = shutDown(createGame(tourismScenario(), 'none'))
    expect(buildPostMortem(none).priceSeasons).toBeUndefined()
  })
})

function getMonth(s: GameState, week: number): number {
  const cfg = s.scenario.bookings!
  const woy = ((cfg.startWeekOfYear - 1 + week - 1) % 52) + 1
  return Math.min(12, Math.floor(((woy - 1) * 12) / 52) + 1)
}
