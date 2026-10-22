import { describe, expect, it } from 'vitest'
import { loadScenario } from '@founder-mode/content'
import {
  createGame,
  getView,
  endWeek,
  respond,
  replay,
  toSave,
  type BookingsPlan,
} from '@founder-mode/engine'
import { PlanBuilder, playsIn } from '../src/strategy'
import { runGame } from '../src/simulate'
import { CAREFUL_TOURISM, TOURISM_STRATEGIES } from '../src/strategies/tourism'
import { evaluateTourismTargets } from '../src/tourismReport'
import { fitnessWanted, planFitness, priceFitness } from '../src/strategies/fitness'

const spec = loadScenario('schweissperle', 'long')
const strategies = TOURISM_STRATEGIES.filter((s) => playsIn(s, spec))
const empty = (): BookingsPlan => ({
  shifts: {},
  founderShifts: {},
  prices: {},
  policy: null,
  platform: null,
  partnerships: [],
  outreach: {},
})
function opened() {
  const s = createGame(spec, 'fitness-visible')
  s.product.features = s.product.features.map((f) => ({
    ...f,
    shippedWeek: ['fit_out', 'strength_classes', 'booking_app', 'monthly_membership'].includes(f.id)
      ? 0
      : null,
  }))
  s.bookings!.leisure!.openingWeek = 1
  return getView(s)
}

describe('fitness players', () => {
  it('finances the common fit-out without starving the first interviews', () => {
    const player = strategies.find((s) => s.id === 'tourism_careful')!.create(spec, 'test-1')
    const p = player.plan(getView(createGame(spec, 'test-1')))
    expect(p.loan?.planHours).toBeGreaterThan(0)
    expect(Object.keys(p.interviews)).toHaveLength(3)
  })
  it('covers scheduled classes rather than treating a timetable as a pooled guest shift', () => {
    const v = opened()
    const b = new PlanBuilder(v, 50)
    const p = empty()
    planFitness(spec, v, b, p, CAREFUL_TOURISM, {})
    const classes = Object.values(p.leisure!.timetable!.strength_classes!).reduce(
      (a, n) => a + n,
      0,
    )
    const shifts =
      Object.values(p.shifts).reduce((a, n) => a + n, 0) +
      Object.values(p.founderShifts).reduce((a, n) => a + n, 0)
    expect(classes).toBe(10)
    expect(shifts).toBe(classes)
    expect(b.free).toBeGreaterThanOrEqual(18)
    const roomHours = Object.values(p.leisure!.timetable!).reduce(
      (a, slots) => a + Object.values(slots).reduce((x, n) => x + n, 0),
      0,
    )
    expect(roomHours).toBe(classes)
    expect(p.platform).toBe(false)
  })
  it('keeps monthly budget hints out of ticket prices and enables only prepared offers', () => {
    const v = opened()
    const p = empty()
    priceFitness(spec, v, p, CAREFUL_TOURISM)
    expect(p.prices.young_professionals!.peak).toBe(2600)
    expect(p.leisure!.offers!.monthly_membership).toEqual({ enabled: true, priceCents: 13900 })
    expect(p.leisure!.offers!.premium_pack!.enabled).toBe(false)
  })
  it('uses real quiet-slot observations for aggregator access and isolates all/none variants', () => {
    const v = opened()
    const sample = {
      week: 1,
      turnedAway: {},
      slots: [
        {
          productId: 'strength_classes',
          slotId: 'evening',
          visits: 50,
          turnedAway: 2,
          aggregator: 0,
          load: 'packed' as const,
        },
      ],
    }
    v.bookings!.leisure!.history = [
      sample as NonNullable<NonNullable<typeof v.bookings>['leisure']>['history'][number],
    ]
    const access = (aggregator?: 'all' | 'none') => {
      const p = empty()
      planFitness(
        spec,
        v,
        new PlanBuilder(v, 50),
        p,
        { ...CAREFUL_TOURISM, leisure: aggregator ? { aggregator } : {} },
        {},
      )
      return p.leisure!.aggregator!
    }
    expect(access().slots).not.toContain('evening')
    expect(access('all').slots).toContain('evening')
    expect(access('none')).toEqual({ slots: [], leave: true })
  })
  it('keeps forced reformer choices independent of hidden niche values', () => {
    const v = opened()
    const needs = (reformer: 'always' | 'never') =>
      fitnessWanted(spec, v, { ...CAREFUL_TOURISM, leisure: { reformer } }, [
        'reformer_pilates',
        'premium_pack',
      ])
    expect(needs('always')).toContain('premium_pack')
    expect(needs('never')).not.toContain('reformer_pilates')
  })
  it('reports F1–F5, measures later loans, and excludes inapplicable T11', () => {
    const careful = strategies.find((s) => s.id === 'tourism_careful')!
    const result = runGame(spec, careful, 'fitness-report')
    const rows = evaluateTourismTargets({
      engineVersion: 'test',
      runs: 1,
      seedPrefix: 'fitness-report',
      tourism: true,
      strategies: strategies.map((s) => ({
        id: s.id,
        description: s.description,
        results: [result],
        seconds: 0,
      })),
    })
    for (const id of ['F1', 'F2', 'F3', 'F4', 'F5'])
      expect(rows.some((r) => r.id === id)).toBe(true)
    expect(rows.find((r) => r.id === 15)!.value).not.toBe('-')
    expect(rows.some((r) => r.id === 11)).toBe(false)
    expect(result.tourism!.leisure!.fitness).toBeDefined()
  })
  it('retains a January expansion while careful can remove quiet classes', () => {
    const v = opened()
    const p = empty()
    planFitness(
      spec,
      v,
      new PlanBuilder(v, 50),
      p,
      { ...CAREFUL_TOURISM, leisure: { januaryPeak: true } },
      { 'strength_classes/evening': 7 },
    )
    expect(p.leisure!.timetable!.strength_classes!.evening).toBe(7)
    const normal = empty()
    planFitness(spec, v, new PlanBuilder(v, 50), normal, CAREFUL_TOURISM, {})
    expect(normal.leisure!.timetable!.strength_classes!.evening).toBe(2)
  })
  it('opens with real actions and replays the complete saved run', () => {
    let state = createGame(spec, 'test-1')
    const player = strategies.find((s) => s.id === 'tourism_careful')!.create(spec, 'test-1')
    while (state.status === 'running') {
      for (const a of player.respond?.(getView(state)) ?? [])
        state = respond(state, a.messageId, a.choiceId)
      const r = endWeek(state, player.plan(getView(state)))
      state = r.state
      player.observe?.(r.report, getView(state))
    }
    expect(state.bookings!.leisure!.openingWeek).not.toBeNull()
    expect(replay(spec, toSave(state))).toEqual(state)
  })
  it.each(strategies.map((s) => [s.id, s] as const))(
    '%s finishes with valid plans',
    (_id, strategy) => {
      const r = runGame(spec, strategy, 'fitness-smoke')
      expect(r.weeks).toBeGreaterThan(0)
      expect(r.weeks).toBeLessThanOrEqual(104)
    },
  )
})
